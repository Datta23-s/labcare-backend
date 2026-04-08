const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const isPostgres = sequelize.getDialect() === 'postgres';

const MaintenanceLog = sequelize.define('MaintenanceLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  lab_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  type: {
    type: isPostgres
      ? DataTypes.STRING(20)
      : DataTypes.ENUM('preventive', 'corrective', 'upgrade'),
    allowNull: false,
    validate: {
      isIn: [['preventive', 'corrective', 'upgrade']]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  performed_by: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'maintenance_logs',
  timestamps: true
});

module.exports = MaintenanceLog;
