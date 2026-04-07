const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Lab = sequelize.define('Lab', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  floor: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  building: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  assigned_assistant: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'labs',
  timestamps: true
});

module.exports = Lab;
