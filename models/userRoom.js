const Sequelize = require('sequelize');
const sequelize = require('../utils/database');

const UserRoom = sequelize.define('userRoom', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
});

module.exports = UserRoom;
