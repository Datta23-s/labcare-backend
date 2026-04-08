const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const isPostgres = sequelize.getDialect() === 'postgres';

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: isPostgres
      ? DataTypes.STRING(20)
      : DataTypes.ENUM('issue_update', 'assignment', 'system'),
    allowNull: false,
    defaultValue: 'system',
    validate: {
      isIn: [['issue_update', 'assignment', 'system']]
    }
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  link: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'notifications',
  timestamps: true
});

module.exports = Notification;
