const moment = require('moment');

const formatMessage = (user, text) => {
  return {
    user,
    text,
    date: moment().format('h:mm a'),
  };
};

module.exports = formatMessage;
