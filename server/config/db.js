// server/config/db.js
// Sequelize ORM connected to SQLite (zero-infra, swap to PostgreSQL by changing dialect + connection)

const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './veyano.db';

let sequelize;
if (process.env.VERCEL) {
  // Mock sequelize to avoid sqlite3 native lib segfaults on Vercel
  console.warn('⚠️ Running on Vercel: Using Mock Sequelize to bypass unsupported SQLite native module.');
  sequelize = {
    define: () => ({
      hasMany: () => {}, belongsTo: () => {}, hasOne: () => {}, belongsToMany: () => {},
      sync: async () => {}, findAll: async () => [], findByPk: async () => {},
      create: async () => {}, update: async () => {}, destroy: async () => {}
    }),
    authenticate: async () => {},
    sync: async () => {},
  };
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.resolve(__dirname, '..', dbPath),
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: false,
    },
  });
}

module.exports = sequelize;
