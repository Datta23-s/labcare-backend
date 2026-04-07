const { Issue, User, Lab, MaintenanceLog, Schedule } = require('../models');
const sequelize = require('../config/database');

// GET /api/v1/dashboard/stats
exports.getStats = async (req, res) => {
  try {
    const totalIssues = await Issue.count();
    const openIssues = await Issue.count({ where: { status: 'open' } });
    const inProgressIssues = await Issue.count({ where: { status: 'in_progress' } });
    const resolvedIssues = await Issue.count({ where: { status: 'resolved' } });
    const closedIssues = await Issue.count({ where: { status: 'closed' } });
    const totalUsers = await User.count();
    const totalLabs = await Lab.count();
    const totalStudents = await User.count({ where: { role: 'student' } });
    const totalAssistants = await User.count({ where: { role: 'lab_assistant' } });

    // Issues by type
    const issuesByType = await Issue.findAll({
      attributes: [
        'type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['type'],
      raw: true
    });

    // Issues by priority
    const issuesByPriority = await Issue.findAll({
      attributes: [
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['priority'],
      raw: true
    });

    // Issues by lab
    const issuesByLab = await Issue.findAll({
      attributes: [
        'lab_id',
        [sequelize.fn('COUNT', sequelize.col('Issue.id')), 'count']
      ],
      include: [{ model: Lab, as: 'lab', attributes: ['name'] }],
      group: ['lab_id', 'lab.id', 'lab.name'],
      raw: true,
      nest: true
    });

    // Recent issues
    const recentIssues = await Issue.findAll({
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'name'] },
        { model: Lab, as: 'lab', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

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
      recentIssues
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
