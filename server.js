const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const bodyParser = require('body-parser');
const sequelize = require('./utils/database');
const { Op } = require('sequelize');
const Room = require('./models/room');
const User = require('./models/user');
const UserRoom = require('./models/userRoom');
const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require('./utils/users');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: false }));

const server = http.createServer(app);
const io = socketio(server);

app.get('/', (req, res, next) => {
  //if user signed in
  res.redirect('/login');
  //else
  //redirect to home
});

app.get('/login', (req, res, next) => {
  res.render('login');
});

app.get('/signup', (req, res, next) => {
  res.render('signup');
});

app.post('/signup', (req, res, next) => {
  console.log(req.body);
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  User.findOne({
    where: { email },
  })
    .then(user => {
      if (user) {
        return res.redirect('/signup');
      }

      const newUser = User.build({ username, email, password });
      return newUser.save();
    })
    .then(result => {
      res.redirect('/login');
    })
    .catch(err => console.log(err));
});

app.use(express.static('public'));

// app.use((req, res, next) => {
//   User.findByPk(1)
//     .then(user => {
//       req.user = user;
//       next();
//     })
//     .catch(err => {
//       console.log(err);
//     });
// });

app.get('/home', (req, res, next) => {
  req.user
    .getRooms()
    .then(rooms => {
      res.render('home', {
        path: '/',
        pageTitle: 'Dashboard',
        rooms,
      });
    })
    .catch(err => {
      console.log(err);
    });
});

app.get('/rooms', (req, res) => {
  res.sendFile(__dirname + '/public/chat.html');
});

app.post('/join-room', (req, res) => {
  UserRoom.findAll({
    group: ['roomId'],
    attributes: ['roomId', [sequelize.fn('COUNT', 'userId'), 'peoplePerRoom']],
    raw: true,
  })
    .then(allRooms => {
      console.log(allRooms);
      const firstAvailableRoom = allRooms.find(room => {
        return room.peoplePerRoom < 2;
      });
      if (firstAvailableRoom) {
        res.redirect(
          `/rooms?username=yysindi&room=${firstAvailableRoom.roomId}`
        );
      }
      return req.user.createRoom().then(room => {
        res.redirect(`/rooms?username=yysindi&room=${room.id}`);
      });
    })
    .catch(err => {
      console.log(err);
    });
});

io.on('connect', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);
    socket.join(user.room);

    socket.emit('message', formatMessage('CliqueBot', 'Welcome to Clique!'));

    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage('CliqueBot', `${user.username} has joined the chat!`)
      );

    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });
  console.log('WebSocket successfully connected');

  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  socket.on('disconnect', () => {
    const user = userLeave(socket.id);
    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage('CliqueBot', `${user.username} has left the chat!`)
      );

      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

const PORT = 3001 || process.env.PORT;

User.belongsToMany(Room, { through: UserRoom });
Room.belongsToMany(User, { through: UserRoom });

sequelize
  .sync()
  // .then(result => {
  //   return User.findByPk(2);
  //   // console.log(result);
  // })
  // .then(user => {
  //   if (!user) {
  //     User.create({ name: 'Yasmeen', email: 'test@test.com' });
  //   }
  //   return user;
  // })
  // .then(user => {
  //   console.log(user);
  //   return user.createRoom();
  // })
  .then(() => {
    server.listen(PORT, () => {
      console.log('Server connected');
    });
  })
  .catch(err => {
    console.log(err);
  });
