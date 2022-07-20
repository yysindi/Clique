const Room = require('../models/room');

exports.getRooms = (req, res, next) => {
  req.user
    .getRoom()
    .then(room => {
      console.log('!!!!!!!!!!!!!!!!!!!!!!');
      console.log(room);
    })
    .catch(err => {
      console.log(err);
    });
};
