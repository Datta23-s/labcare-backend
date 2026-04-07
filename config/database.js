require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');

let sequelize;

// Try MySQL first, fall back to SQLite
if (process.env.DB_HOST && process.env.DB_NAME) {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'labcare_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      define: {
        timestamps: true,
        underscored: true
      }
    }
  );
} else {
  // SQLite fallback — zero config, works anywhere
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'labcare.sqlite'),
    logging: false,
    define: {
      timestamps: true,
      underscored: true
    }
  });
}

module.exports = sequelize;
