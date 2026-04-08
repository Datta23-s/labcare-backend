const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const isPostgres = sequelize.getDialect() === 'postgres';

const Issue = sequelize.define('Issue', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ticket_id: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: false
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  lab_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  type: {
    type: isPostgres
      ? DataTypes.STRING(20)
      : DataTypes.ENUM('hardware', 'software', 'network', 'electrical', 'other'),
    allowNull: false,
    validate: {
      isIn: [['hardware', 'software', 'network', 'electrical', 'other']]
    }
  },
  priority: {
    type: isPostgres
      ? DataTypes.STRING(20)
      : DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium',
    validate: {
      isIn: [['low', 'medium', 'high', 'critical']]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  image_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  status: {
    type: isPostgres
      ? DataTypes.STRING(20)
      : DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
    allowNull: false,
    defaultValue: 'open',
    validate: {
      isIn: [['open', 'in_progress', 'resolved', 'closed']]
    }
  },
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pc_number: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'PC number affected (e.g. PC-01)'
  }
}, {
  tableName: 'issues',
  timestamps: true
});

module.exports = Issue;
