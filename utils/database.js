const Sequelize = require('sequelize');

const sequelize = new Sequelize('clique-database', 'root', 'BananaTV12!', {
  dialect: 'mysql',
  host: 'localhost',
});

module.exports = sequelize;
