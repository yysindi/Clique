const Sequelize = require('sequelize');
const sequelize = require('../utils/database');

const Room = sequelize.define('room', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
});

module.exports = Room;
