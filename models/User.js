const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const isPostgres = sequelize.getDialect() === 'postgres';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: isPostgres 
      ? DataTypes.STRING(20) 
      : DataTypes.ENUM('student', 'lab_assistant', 'admin'),
    allowNull: false,
    defaultValue: 'student',
    validate: {
      isIn: [['student', 'lab_assistant', 'admin']]
    }
  },
  lab_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  avatar_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true
});

module.exports = User;
