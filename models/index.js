const User = require('./User');
const Lab = require('./Lab');
const Issue = require('./Issue');
const Schedule = require('./Schedule');
const MaintenanceLog = require('./MaintenanceLog');
const Notification = require('./Notification');

// ── Associations ──

// User ↔ Lab
User.belongsTo(Lab, { foreignKey: 'lab_id', as: 'lab' });
Lab.hasMany(User, { foreignKey: 'lab_id', as: 'members' });

// Lab → assigned assistant
Lab.belongsTo(User, { foreignKey: 'assigned_assistant', as: 'assistant' });

// Issue → Student (reporter)
Issue.belongsTo(User, { foreignKey: 'student_id', as: 'reporter' });
User.hasMany(Issue, { foreignKey: 'student_id', as: 'reportedIssues' });

// Issue → Lab
Issue.belongsTo(Lab, { foreignKey: 'lab_id', as: 'lab' });
Lab.hasMany(Issue, { foreignKey: 'lab_id', as: 'issues' });

// Issue → Assigned user
Issue.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });

// Schedule → Lab
Schedule.belongsTo(Lab, { foreignKey: 'lab_id', as: 'lab' });
Lab.hasMany(Schedule, { foreignKey: 'lab_id', as: 'schedules' });

// Schedule → Creator
Schedule.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// MaintenanceLog → Lab
MaintenanceLog.belongsTo(Lab, { foreignKey: 'lab_id', as: 'lab' });
Lab.hasMany(MaintenanceLog, { foreignKey: 'lab_id', as: 'maintenanceLogs' });

// MaintenanceLog → Creator
MaintenanceLog.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Notification → User
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });

module.exports = {
  User,
  Lab,
  Issue,
  Schedule,
  MaintenanceLog,
  Notification
};
