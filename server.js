require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const sequelize = require('./config/database');
const { initSocket } = require('./services/socketService');

// Import models (triggers associations)
const { User, Lab, Issue, Schedule, MaintenanceLog, Notification, PC } = require('./models');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Initialize socket service
initSocket(io);

// Middleware
const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));

// API Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/issues', require('./routes/issues'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/labs', require('./routes/labs'));
app.use('/api/v1/schedules', require('./routes/schedules'));
app.use('/api/v1/maintenance', require('./routes/maintenance'));
app.use('/api/v1/dashboard', require('./routes/dashboard'));
app.use('/api/v1/notifications', require('./routes/notifications'));
app.use('/api/v1', require('./routes/pcs'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  res.status(500).json({ message: 'Internal server error.' });
});

// Seed Data
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  try {
    const userCount = await User.count();
    const pcCount = await PC.count();

    // If we have users but no PCs, this is the old seed. Wipe it to apply the new 35-lab seed.
    if (userCount > 0 && pcCount === 0) {
      console.log('⚠️ Old database structure detected (no PCs). Wiping to apply new seed...');
      await sequelize.drop();
      await sequelize.sync({ force: true });
    } else if (userCount > 0) {
      console.log('📦 Database already seeded, skipping...');
      return;
    }

    console.log('🌱 Seeding database with 5 floors × 7 labs × 30 PCs...');
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash('password123', salt);

    // ── Create 35 Labs (5 floors × 7 labs) ──
    const floorNames = ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Floor 5'];
    const labTypes = [
      'Computer Science Lab', 'Networking Lab', 'AI & ML Lab',
      'Software Engineering Lab', 'Database Lab', 'Cyber Security Lab', 'IoT Lab'
    ];

    const allLabs = [];
    for (let floor = 1; floor <= 5; floor++) {
      for (let labIdx = 0; labIdx < 7; labIdx++) {
        const labNum = (floor * 100) + (labIdx + 1);
        const lab = await Lab.create({
          name: `${labTypes[labIdx]} ${floor}${String(labIdx + 1).padStart(2, '0')}`,
          floor: floorNames[floor - 1],
          building: 'Main Block',
          total_pcs: 30,
          working_pcs: 30,
          not_working_pcs: 0
        });
        allLabs.push(lab);
      }
    }
    console.log(`   ✅ Created ${allLabs.length} labs`);

    // ── Create Admin ──
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@labcare.com',
      password_hash: hash,
      role: 'admin'
    });

    // ── Create Lab Assistants (1 per lab = 35) ──
    const assistantNames = [
      'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Neha Gupta', 'Vikram Reddy',
      'Sneha Joshi', 'Rohit Verma', 'Kavita Singh', 'Arjun Nair', 'Meena Rao',
      'Suresh Iyer', 'Pooja Mehta', 'Kiran Desai', 'Anita Bhat', 'Manish Tiwari',
      'Deepa Kulkarni', 'Rahul Saxena', 'Swati Mishra', 'Nitin Agarwal', 'Ritu Pandey',
      'Sanjay Chauhan', 'Preeti Yadav', 'Gaurav Dubey', 'Asha Patil', 'Manoj Srivastava',
      'Divya Rajan', 'Anil Kapoor', 'Sunita Jha', 'Prakash Menon', 'Lata Pillai',
      'Harish Nayak', 'Geeta Thakur', 'Vivek Choudhary', 'Shweta Goyal', 'Tarun Malhotra'
    ];

    const assistants = [];
    for (let i = 0; i < allLabs.length; i++) {
      const name = assistantNames[i] || `Lab Assistant ${i + 1}`;
      const emailName = name.toLowerCase().replace(/\s+/g, '.').replace(/&/g, '');
      const assistant = await User.create({
        name,
        email: `${emailName}@labcare.com`,
        password_hash: hash,
        role: 'lab_assistant',
        lab_id: allLabs[i].id
      });
      assistants.push(assistant);

      // Assign assistant to lab
      await allLabs[i].update({ assigned_assistant: assistant.id });
    }
    console.log(`   ✅ Created ${assistants.length} lab assistants`);

    // ── Create Students ──
    const students = [];
    const studentData = [
      { name: 'Sarthak Verma', email: 'sarthak@student.com', lab_id: allLabs[0].id },
      { name: 'Ananya Patel', email: 'ananya@student.com', lab_id: allLabs[1].id },
      { name: 'Vikram Singh', email: 'vikram@student.com', lab_id: allLabs[7].id },
      { name: 'Riya Kapoor', email: 'riya@student.com', lab_id: allLabs[14].id },
      { name: 'Dev Sharma', email: 'dev@student.com', lab_id: allLabs[21].id },
      { name: 'Megha Jain', email: 'megha@student.com', lab_id: allLabs[28].id },
    ];

    for (const s of studentData) {
      const student = await User.create({
        name: s.name, email: s.email, password_hash: hash,
        role: 'student', lab_id: s.lab_id
      });
      students.push(student);
    }
    console.log(`   ✅ Created ${students.length} students`);

    // ── Create PCs (30 per lab = 1050 total) ──
    console.log('   🖥️  Seeding 1050 PCs...');
    const pcBulkData = [];
    for (const lab of allLabs) {
      for (let pcNum = 1; pcNum <= 30; pcNum++) {
        pcBulkData.push({
          pc_number: `PC-${String(pcNum).padStart(2, '0')}`,
          lab_id: lab.id,
          status: 'working',
          problem: null
        });
      }
    }
    await PC.bulkCreate(pcBulkData);
    console.log(`   ✅ Created ${pcBulkData.length} PCs`);

    // ── Mark some PCs as not working (for demo) ──
    const demoProblems = [
      'Blue screen error after Windows logo',
      'Monitor flickering, possible cable issue',
      'Keyboard not responsive, keys stuck',
      'Mouse cursor freezing intermittently',
      'No boot — BIOS beep codes indicate RAM failure',
      'Network adapter not detected',
      'USB ports not working on front panel',
      'Hard drive making clicking sounds',
      'Power button unresponsive',
      'Overheating — fan not spinning'
    ];

    // Mark ~3 PCs per lab for first 10 labs as broken
    for (let i = 0; i < 10; i++) {
      const labId = allLabs[i].id;
      const brokenPCs = await PC.findAll({
        where: { lab_id: labId },
        limit: 3,
        order: sequelize.random()
      });

      let brokenCount = 0;
      for (const pc of brokenPCs) {
        pc.status = 'not_working';
        pc.problem = demoProblems[Math.floor(Math.random() * demoProblems.length)];
        pc.last_reported_by = students[Math.floor(Math.random() * students.length)].id;
        await pc.save();
        brokenCount++;
      }

      // Update lab cached counts
      await allLabs[i].update({
        working_pcs: 30 - brokenCount,
        not_working_pcs: brokenCount
      });
    }
    console.log('   ✅ Marked demo PCs as not working');

    // ── Create sample issues ──
    await Issue.bulkCreate([
      {
        ticket_id: 'LAB-00001', student_id: students[0].id, lab_id: allLabs[0].id,
        type: 'hardware', priority: 'high', pc_number: 'PC-12',
        description: 'PC #12 not booting up. Shows blue screen error after Windows logo.',
        status: 'open', assigned_to: assistants[0].id
      },
      {
        ticket_id: 'LAB-00002', student_id: students[1].id, lab_id: allLabs[1].id,
        type: 'software', priority: 'medium', pc_number: 'PC-05',
        description: 'Visual Studio Code fails to open on workstation #5. Throws a missing DLL error.',
        status: 'in_progress', assigned_to: assistants[1].id,
        remarks: 'Reinstalling VS Code, will check DLL dependencies.'
      },
      {
        ticket_id: 'LAB-00003', student_id: students[2].id, lab_id: allLabs[7].id,
        type: 'network', priority: 'critical',
        description: 'Entire lab lost internet connectivity. Switch indicator lights are off.',
        status: 'open', assigned_to: assistants[7].id
      },
      {
        ticket_id: 'LAB-00004', student_id: students[0].id, lab_id: allLabs[0].id,
        type: 'electrical', priority: 'high', pc_number: 'PC-08',
        description: 'Power socket near workstation #8 is sparking. Potential fire hazard.',
        status: 'resolved', assigned_to: assistants[0].id,
        remarks: 'Electrician replaced the faulty socket. Tested and working fine.'
      },
      {
        ticket_id: 'LAB-00005', student_id: students[1].id, lab_id: allLabs[14].id,
        type: 'software', priority: 'low',
        description: 'Request to install TensorFlow and PyTorch on all workstations for ML coursework.',
        status: 'open'
      },
      {
        ticket_id: 'LAB-00006', student_id: students[2].id, lab_id: allLabs[7].id,
        type: 'hardware', priority: 'medium', pc_number: 'PC-03',
        description: 'Monitor on workstation #3 has a flickering display. Makes it hard to work.',
        status: 'in_progress', assigned_to: assistants[7].id,
        remarks: 'Checking cable connections and trying a spare monitor.'
      },
      {
        ticket_id: 'LAB-00007', student_id: students[0].id, lab_id: allLabs[0].id,
        type: 'other', priority: 'low',
        description: 'Air conditioning not working in the lab. Very uncomfortable during afternoon sessions.',
        status: 'closed',
        remarks: 'Reported to facilities. AC serviced and working now.'
      }
    ]);

    // ── Create sample schedules ──
    await Schedule.bulkCreate([
      { lab_id: allLabs[0].id, day: 'Monday', start_time: '09:00', end_time: '11:00', subject: 'Data Structures Lab', instructor: 'Dr. Mehta', created_by: admin.id },
      { lab_id: allLabs[0].id, day: 'Monday', start_time: '14:00', end_time: '16:00', subject: 'Operating Systems Lab', instructor: 'Prof. Singh', created_by: admin.id },
      { lab_id: allLabs[0].id, day: 'Tuesday', start_time: '09:00', end_time: '11:00', subject: 'DBMS Lab', instructor: 'Dr. Gupta', created_by: admin.id },
      { lab_id: allLabs[1].id, day: 'Monday', start_time: '09:00', end_time: '11:00', subject: 'Web Development Lab', instructor: 'Prof. Khan', created_by: admin.id },
      { lab_id: allLabs[1].id, day: 'Wednesday', start_time: '11:00', end_time: '13:00', subject: 'Software Engineering Lab', instructor: 'Dr. Reddy', created_by: admin.id },
      { lab_id: allLabs[7].id, day: 'Tuesday', start_time: '14:00', end_time: '16:00', subject: 'Computer Networks Lab', instructor: 'Prof. Joshi', created_by: admin.id },
      { lab_id: allLabs[14].id, day: 'Thursday', start_time: '09:00', end_time: '12:00', subject: 'Machine Learning Lab', instructor: 'Dr. Iyer', created_by: admin.id },
      { lab_id: allLabs[14].id, day: 'Friday', start_time: '14:00', end_time: '17:00', subject: 'Deep Learning Lab', instructor: 'Dr. Iyer', created_by: admin.id }
    ]);

    // ── Create sample maintenance logs ──
    await MaintenanceLog.bulkCreate([
      { lab_id: allLabs[0].id, type: 'preventive', description: 'Quarterly cleaning of all workstations and peripherals', performed_by: assistantNames[0], date: '2026-03-15', cost: 5000, created_by: admin.id },
      { lab_id: allLabs[0].id, type: 'corrective', description: 'Replaced faulty RAM on workstation #12 (8GB DDR4)', performed_by: 'TechServ Solutions', date: '2026-03-20', cost: 2500, created_by: assistants[0].id },
      { lab_id: allLabs[7].id, type: 'upgrade', description: 'Upgraded network switch to Gigabit managed switch', performed_by: 'NetPro Services', date: '2026-03-10', cost: 15000, created_by: admin.id },
      { lab_id: allLabs[1].id, type: 'preventive', description: 'Antivirus update and full scan on all 30 workstations', performed_by: assistantNames[1], date: '2026-04-01', cost: 0, created_by: assistants[1].id }
    ]);

    // ── Create sample notifications ──
    await Notification.bulkCreate([
      { user_id: students[0].id, title: 'Issue Resolved', message: 'Your issue LAB-00004 (Power socket sparking) has been resolved.', type: 'issue_update', link: '/issues/4' },
      { user_id: assistants[0].id, title: 'New Issue Assigned', message: 'New issue LAB-00001 assigned to you in CS Lab 101.', type: 'assignment', link: '/issues/1' },
      { user_id: assistants[7].id, title: 'Critical Issue', message: 'Critical issue LAB-00003 reported in Networking Lab 201.', type: 'assignment', link: '/issues/3' }
    ]);

    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('📋 Demo Accounts:');
    console.log('   Admin:         admin@labcare.com / password123');
    console.log('   Lab Assistant: rajesh.kumar@labcare.com / password123');
    console.log('   Lab Assistant: priya.sharma@labcare.com / password123');
    console.log('   Student:       sarthak@student.com / password123');
    console.log('   Student:       ananya@student.com / password123');
    console.log('   Student:       vikram@student.com / password123');
    console.log(`   ... and ${assistants.length - 2} more lab assistants`);
  } catch (error) {
    console.error('Seed error:', error);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    console.log(`🔌 Connecting to database (Dialect: ${sequelize.getDialect()})...`);
    await sequelize.authenticate();
    console.log(`✅ ${sequelize.getDialect().toUpperCase()} connected.`);

    // Sync models
    console.log('🔄 Syncing database models...');
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synced.');

    // Seed data
    console.log('🌱 Checking for seed data...');
    await seedDatabase();

    server.listen(PORT, () => {
      console.log(`\n🚀 LabCare API running on http://localhost:${PORT}`);
      console.log(`📡 Socket.io ready`);
      console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}\n`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
};

startServer();
