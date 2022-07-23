const moment = require('moment');
const formatMessage = (user, text) => {
  return {
    user,
    text,
    date: moment().format('HH:mm'),
  };
};

module.exports = formatMessage;
