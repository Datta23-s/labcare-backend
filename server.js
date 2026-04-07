require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const sequelize = require('./config/database');
const { initSocket } = require('./services/socketService');

// Import models (triggers associations)
const { User, Lab, Issue, Schedule, MaintenanceLog, Notification } = require('./models');

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
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/issues', require('./routes/issues'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/labs', require('./routes/labs'));
app.use('/api/v1/schedules', require('./routes/schedules'));
app.use('/api/v1/maintenance', require('./routes/maintenance'));
app.use('/api/v1/dashboard', require('./routes/dashboard'));
app.use('/api/v1/notifications', require('./routes/notifications'));

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
    if (userCount > 0) {
      console.log('📦 Database already seeded, skipping...');
      return;
    }

    console.log('🌱 Seeding database...');
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash('password123', salt);

    // Create labs
    const labs = await Lab.bulkCreate([
      { name: 'Computer Science Lab 1', floor: 'Ground Floor', building: 'CS Block' },
      { name: 'Computer Science Lab 2', floor: '1st Floor', building: 'CS Block' },
      { name: 'Networking Lab', floor: '2nd Floor', building: 'CS Block' },
      { name: 'AI & ML Lab', floor: '3rd Floor', building: 'CS Block' },
      { name: 'Electronics Lab', floor: 'Ground Floor', building: 'ECE Block' },
      { name: 'Physics Lab', floor: '1st Floor', building: 'Science Block' }
    ]);

    // Create users
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@labcare.com',
      password_hash: hash,
      role: 'admin'
    });

    const assistant1 = await User.create({
      name: 'Rajesh Kumar',
      email: 'rajesh@labcare.com',
      password_hash: hash,
      role: 'lab_assistant',
      lab_id: labs[0].id
    });

    const assistant2 = await User.create({
      name: 'Priya Sharma',
      email: 'priya@labcare.com',
      password_hash: hash,
      role: 'lab_assistant',
      lab_id: labs[2].id
    });

    const student1 = await User.create({
      name: 'Sarthak Verma',
      email: 'sarthak@student.com',
      password_hash: hash,
      role: 'student',
      lab_id: labs[0].id
    });

    const student2 = await User.create({
      name: 'Ananya Patel',
      email: 'ananya@student.com',
      password_hash: hash,
      role: 'student',
      lab_id: labs[1].id
    });

    const student3 = await User.create({
      name: 'Vikram Singh',
      email: 'vikram@student.com',
      password_hash: hash,
      role: 'student',
      lab_id: labs[2].id
    });

    // Assign assistants to labs
    await labs[0].update({ assigned_assistant: assistant1.id });
    await labs[1].update({ assigned_assistant: assistant1.id });
    await labs[2].update({ assigned_assistant: assistant2.id });

    // Create sample issues
    await Issue.bulkCreate([
      {
        ticket_id: 'LAB-00001',
        student_id: student1.id,
        lab_id: labs[0].id,
        type: 'hardware',
        priority: 'high',
        description: 'PC #12 not booting up. Shows blue screen error after Windows logo.',
        status: 'open',
        assigned_to: assistant1.id
      },
      {
        ticket_id: 'LAB-00002',
        student_id: student2.id,
        lab_id: labs[1].id,
        type: 'software',
        priority: 'medium',
        description: 'Visual Studio Code fails to open on workstation #5. Throws a missing DLL error.',
        status: 'in_progress',
        assigned_to: assistant1.id,
        remarks: 'Reinstalling VS Code, will check DLL dependencies.'
      },
      {
        ticket_id: 'LAB-00003',
        student_id: student3.id,
        lab_id: labs[2].id,
        type: 'network',
        priority: 'critical',
        description: 'Entire lab lost internet connectivity. Switch indicator lights are off.',
        status: 'open',
        assigned_to: assistant2.id
      },
      {
        ticket_id: 'LAB-00004',
        student_id: student1.id,
        lab_id: labs[0].id,
        type: 'electrical',
        priority: 'high',
        description: 'Power socket near workstation #8 is sparking. Potential fire hazard.',
        status: 'resolved',
        assigned_to: assistant1.id,
        remarks: 'Electrician replaced the faulty socket. Tested and working fine.'
      },
      {
        ticket_id: 'LAB-00005',
        student_id: student2.id,
        lab_id: labs[3].id,
        type: 'software',
        priority: 'low',
        description: 'Request to install TensorFlow and PyTorch on all workstations for ML coursework.',
        status: 'open'
      },
      {
        ticket_id: 'LAB-00006',
        student_id: student3.id,
        lab_id: labs[2].id,
        type: 'hardware',
        priority: 'medium',
        description: 'Monitor on workstation #3 has a flickering display. Makes it hard to work.',
        status: 'in_progress',
        assigned_to: assistant2.id,
        remarks: 'Checking cable connections and trying a spare monitor.'
      },
      {
        ticket_id: 'LAB-00007',
        student_id: student1.id,
        lab_id: labs[0].id,
        type: 'other',
        priority: 'low',
        description: 'Air conditioning not working in the lab. Very uncomfortable during afternoon sessions.',
        status: 'closed',
        remarks: 'Reported to facilities. AC serviced and working now.'
      }
    ]);

    // Create sample schedules
    await Schedule.bulkCreate([
      { lab_id: labs[0].id, day: 'Monday', start_time: '09:00', end_time: '11:00', subject: 'Data Structures Lab', instructor: 'Dr. Mehta', created_by: admin.id },
      { lab_id: labs[0].id, day: 'Monday', start_time: '14:00', end_time: '16:00', subject: 'Operating Systems Lab', instructor: 'Prof. Singh', created_by: admin.id },
      { lab_id: labs[0].id, day: 'Tuesday', start_time: '09:00', end_time: '11:00', subject: 'DBMS Lab', instructor: 'Dr. Gupta', created_by: admin.id },
      { lab_id: labs[1].id, day: 'Monday', start_time: '09:00', end_time: '11:00', subject: 'Web Development Lab', instructor: 'Prof. Khan', created_by: admin.id },
      { lab_id: labs[1].id, day: 'Wednesday', start_time: '11:00', end_time: '13:00', subject: 'Software Engineering Lab', instructor: 'Dr. Reddy', created_by: admin.id },
      { lab_id: labs[2].id, day: 'Tuesday', start_time: '14:00', end_time: '16:00', subject: 'Computer Networks Lab', instructor: 'Prof. Joshi', created_by: admin.id },
      { lab_id: labs[3].id, day: 'Thursday', start_time: '09:00', end_time: '12:00', subject: 'Machine Learning Lab', instructor: 'Dr. Iyer', created_by: admin.id },
      { lab_id: labs[3].id, day: 'Friday', start_time: '14:00', end_time: '17:00', subject: 'Deep Learning Lab', instructor: 'Dr. Iyer', created_by: admin.id }
    ]);

    // Create sample maintenance logs
    await MaintenanceLog.bulkCreate([
      { lab_id: labs[0].id, type: 'preventive', description: 'Quarterly cleaning of all workstations and peripherals', performed_by: 'Rajesh Kumar', date: '2026-03-15', cost: 5000, created_by: admin.id },
      { lab_id: labs[0].id, type: 'corrective', description: 'Replaced faulty RAM on workstation #12 (8GB DDR4)', performed_by: 'TechServ Solutions', date: '2026-03-20', cost: 2500, created_by: assistant1.id },
      { lab_id: labs[2].id, type: 'upgrade', description: 'Upgraded network switch to Gigabit managed switch', performed_by: 'NetPro Services', date: '2026-03-10', cost: 15000, created_by: admin.id },
      { lab_id: labs[1].id, type: 'preventive', description: 'Antivirus update and full scan on all 30 workstations', performed_by: 'Priya Sharma', date: '2026-04-01', cost: 0, created_by: assistant2.id }
    ]);

    // Create sample notifications
    await Notification.bulkCreate([
      { user_id: student1.id, title: 'Issue Resolved', message: 'Your issue LAB-00004 (Power socket sparking) has been resolved.', type: 'issue_update', link: '/issues/4' },
      { user_id: assistant1.id, title: 'New Issue Assigned', message: 'New issue LAB-00001 assigned to you in CS Lab 1.', type: 'assignment', link: '/issues/1' },
      { user_id: assistant2.id, title: 'Critical Issue', message: 'Critical issue LAB-00003 reported in Networking Lab.', type: 'assignment', link: '/issues/3' }
    ]);

    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('📋 Demo Accounts:');
    console.log('   Admin:         admin@labcare.com / password123');
    console.log('   Lab Assistant: rajesh@labcare.com / password123');
    console.log('   Lab Assistant: priya@labcare.com / password123');
    console.log('   Student:       sarthak@student.com / password123');
    console.log('   Student:       ananya@student.com / password123');
    console.log('   Student:       vikram@student.com / password123');
  } catch (error) {
    console.error('Seed error:', error);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ MySQL connected.');

    // Sync models (creates tables if not exist)
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced.');

    // Seed data
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
