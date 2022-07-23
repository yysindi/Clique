const sequelize = require('../utils/database');
const Sequelize = require('sequelize');

const Message = sequelize.define('message', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  messageContent: Sequelize.TEXT,
});

module.exports = Message;
