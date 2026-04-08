const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const isPostgres = sequelize.getDialect() === 'postgres';

const Schedule = sequelize.define('Schedule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  lab_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  day: {
    type: isPostgres
      ? DataTypes.STRING(20)
      : DataTypes.ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
    allowNull: false,
    validate: {
      isIn: [['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']]
    }
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  instructor: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'schedules',
  timestamps: true
});

module.exports = Schedule;
