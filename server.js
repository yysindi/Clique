const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');
const bodyParser = require('body-parser');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sequelize = require('./utils/database');
const bcrypt = require('bcryptjs');
const Room = require('./models/room');
const User = require('./models/user');
const UserRoom = require('./models/userRoom');
const isAuthenticated = require('./middleware/isAuthenticated');
const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require('./utils/users');

const app = express();
const store = new SequelizeStore({
  db: sequelize,
});

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  session({
    secret: 'jfnd34tuofi345ansdoia3847ljrehf',
    resave: false,
    saveUninitialized: false,
    store,
    // proxy: true,
  })
);
store.sync();

roomsBelongingToUser = [];

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findByPk(req.session.user.id)
    .then(user => {
      req.user = user;
      user.getRooms().then(rooms => {
        roomsBelongingToUser = [];
        rooms.forEach(room => {
          roomsBelongingToUser.push(room.id);
        });
      });
      next();
    })
    .catch(err => console.log(err));
});

const server = http.createServer(app);
const io = socketio(server);

app.get('/', (req, res, next) => {
  //if user signed in
  res.redirect('/home');
  //else
  //redirect to home
});
app.use(express.static(path.join(__dirname, 'public')));

app.get('/login', (req, res, next) => {
  res.render('login');
});

app.post('/login', (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  User.findOne({
    where: { email },
  }).then(user => {
    if (!user) {
      res.redirect('/login');
    }
    console.log(email, password);
    bcrypt
      .compare(password, user.password)
      .then(passwordMatches => {
        if (passwordMatches) {
          req.session.userAuthenticated = true;
          req.session.user = user;
          return req.session.save(err => {
            console.log(err);
            res.redirect('/home');
          });
        }
        res.redirect('/login');
      })
      .catch(err => {
        console.log(err);
        res.redirect('/login');
      });
  });
});

app.post('/logout', (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/login');
  });
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
      return bcrypt
        .hash(password, 12)
        .then(hashedPassword => {
          const newUser = User.build({
            username,
            email,
            password: hashedPassword,
          });
          return newUser.save();
        })
        .then(result => {
          res.redirect('/login');
        });
    })
    .catch(err => console.log(err));
});

app.get('/home', isAuthenticated, (req, res, next) => {
  console.log(roomsBelongingToUser);
  req.user
    .getRooms()
    .then(rooms => {
      res.render('home', {
        path: '/',
        pageTitle: 'Dashboard',
        rooms,
        username: req.user.username,
        numberOfRooms: roomsBelongingToUser.length,
      });
    })
    .catch(err => {
      console.log(err);
    });
});

app.get('/rooms', isAuthenticated, (req, res) => {
  // res.sendFile(__dirname + '/public/chat.html');
  res.render('chat');
});

app.post('/join-room', isAuthenticated, (req, res) => {
  UserRoom.findAll({
    group: ['roomId'],
    attributes: ['roomId', [sequelize.fn('COUNT', 'userId'), 'peoplePerRoom']],
    raw: true,
  })
    .then(allRooms => {
      console.log(roomsBelongingToUser);
      allRoomsNotBelongingToUser = allRooms.filter(room => {
        return !roomsBelongingToUser.includes(room.roomId);
      });
      const firstAvailableRoom = allRoomsNotBelongingToUser.find(room => {
        return room.peoplePerRoom < 2;
      });
      if (firstAvailableRoom) {
        return res.redirect(
          `/rooms?username=${req.user.username}&room=${firstAvailableRoom.roomId}`
        );
      }
      return req.user.createRoom().then(room => {
        res.redirect(`/rooms?username=${req.user.username}&room=${room.id}`);
      });
    })
    .catch(err => {
      console.log(err);
    });
});

app.post('/delete-room', (req, res, next) => {
  const roomNumber = req.body.roomNumber;
  UserRoom.destroy({
    where: {
      roomId: roomNumber,
      userId: req.user.id,
    },
  })
    .then(() => {
      res.redirect('/home');
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
  //   return User.findByPk(3).then(user => user.createRoom());
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
