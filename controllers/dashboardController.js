const { Issue, User, Lab, MaintenanceLog, Schedule, PC } = require('../models');
const sequelize = require('../config/database');

// GET /api/v1/dashboard/stats
exports.getStats = async (req, res) => {
  try {
    const role = req.user.role;
    const userLabId = req.user.lab_id;

    let issueWhere = {};
    let labWhere = {};

    // Scope data based on role
    if (role === 'student') {
      issueWhere.student_id = req.user.id;
    } else if (role === 'lab_assistant' && userLabId) {
      issueWhere.lab_id = userLabId;
      labWhere.id = userLabId;
    }
    // admin sees everything (no filter)

    const totalIssues = await Issue.count({ where: issueWhere });
    const openIssues = await Issue.count({ where: { ...issueWhere, status: 'open' } });
    const inProgressIssues = await Issue.count({ where: { ...issueWhere, status: 'in_progress' } });
    const resolvedIssues = await Issue.count({ where: { ...issueWhere, status: 'resolved' } });
    const closedIssues = await Issue.count({ where: { ...issueWhere, status: 'closed' } });

    // These are global stats — only meaningful for admin
    const totalUsers = role === 'admin' ? await User.count() : 0;
    const totalStudents = role === 'admin' ? await User.count({ where: { role: 'student' } }) : 0;
    const totalAssistants = role === 'admin' ? await User.count({ where: { role: 'lab_assistant' } }) : 0;

    const labFilter = Object.keys(labWhere).length > 0 ? { where: labWhere } : {};
    const totalLabs = await Lab.count(labFilter);

    // Issues by type (scoped)
    const issuesByType = await Issue.findAll({
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: issueWhere,
      group: ['type'],
      raw: true
    });

    // Issues by priority (scoped)
    const issuesByPriority = await Issue.findAll({
      attributes: [
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: issueWhere,
      group: ['priority'],
      raw: true
    });

    // Issues by lab (scoped)
    const issuesByLabQuery = {
      attributes: [
        'lab_id',
        [sequelize.fn('COUNT', sequelize.col('Issue.id')), 'count']
      ],
      include: [{ model: Lab, as: 'lab', attributes: ['name'] }],
      where: issueWhere,
      group: ['lab_id', 'lab.id', 'lab.name'],
      raw: true,
      nest: true
    };
    const issuesByLab = await Issue.findAll(issuesByLabQuery);

    // Recent issues (scoped)
    const recentIssues = await Issue.findAll({
      where: issueWhere,
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name'] },
        { model: Lab, as: 'lab', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    // ── PC Stats (role-differentiated) ──
    let pcStats = null;

    if (role === 'admin') {
      // Admin: Full building overview by floor
      const allLabs = await Lab.findAll({
        attributes: ['id', 'name', 'floor', 'building', 'total_pcs', 'working_pcs', 'not_working_pcs'],
        include: [{ model: User, as: 'assistant', attributes: ['id', 'name'] }],
        order: [['floor', 'ASC'], ['name', 'ASC']]
      });

      const floorMap = {};
      allLabs.forEach(lab => {
        const floor = lab.floor || 'Unknown';
        if (!floorMap[floor]) {
          floorMap[floor] = { floor, labs: [], totalPCs: 0, working: 0, notWorking: 0 };
        }
        floorMap[floor].labs.push({
          id: lab.id, name: lab.name,
          total: lab.total_pcs, working: lab.working_pcs, notWorking: lab.not_working_pcs,
          assistant: lab.assistant
        });
        floorMap[floor].totalPCs += lab.total_pcs;
        floorMap[floor].working += lab.working_pcs;
        floorMap[floor].notWorking += lab.not_working_pcs;
      });

      const floors = Object.values(floorMap);
      pcStats = {
        totalPCs: floors.reduce((s, f) => s + f.totalPCs, 0),
        workingPCs: floors.reduce((s, f) => s + f.working, 0),
        notWorkingPCs: floors.reduce((s, f) => s + f.notWorking, 0),
        floors
      };
    } else if (role === 'lab_assistant' && userLabId) {
      // Lab assistant: Their lab only
      const lab = await Lab.findByPk(userLabId, {
        attributes: ['id', 'name', 'floor', 'total_pcs', 'working_pcs', 'not_working_pcs']
      });
      if (lab) {
        pcStats = {
          totalPCs: lab.total_pcs,
          workingPCs: lab.working_pcs,
          notWorkingPCs: lab.not_working_pcs,
          labName: lab.name,
          labFloor: lab.floor
        };
      }
    } else if (role === 'student' && userLabId) {
      // Student: Their lab read-only stats
      const lab = await Lab.findByPk(userLabId, {
        attributes: ['id', 'name', 'floor', 'total_pcs', 'working_pcs', 'not_working_pcs']
      });
      if (lab) {
        pcStats = {
          totalPCs: lab.total_pcs,
          workingPCs: lab.working_pcs,
          notWorkingPCs: lab.not_working_pcs,
          labName: lab.name,
          labFloor: lab.floor
        };
      }
    }

    res.json({
      stats: {
        totalIssues,
        openIssues,
        inProgressIssues,
        resolvedIssues,
        closedIssues,
        totalUsers,
        totalLabs,
        totalStudents,
        totalAssistants
      },
      issuesByType,
      issuesByPriority,
      issuesByLab,
      recentIssues,
      pcStats
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
