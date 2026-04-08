const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const isPostgres = sequelize.getDialect() === 'postgres';

const PC = sequelize.define('PC', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  pc_number: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'e.g. PC-01, PC-02 ... PC-30'
  },
  lab_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: isPostgres
      ? DataTypes.STRING(20)
      : DataTypes.ENUM('working', 'not_working', 'under_maintenance'),
    allowNull: false,
    defaultValue: 'working',
    validate: {
      isIn: [['working', 'not_working', 'under_maintenance']]
    }
  },
  problem: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of the problem if not working'
  },
  last_reported_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Student who last reported an issue for this PC'
  },
  last_updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Admin/assistant who last updated this PC status'
  }
}, {
  tableName: 'pcs',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['lab_id', 'pc_number']
    }
  ]
});

module.exports = PC;
