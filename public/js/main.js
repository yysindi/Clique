const socket = io();

const chatMessages = document.querySelector('.chat-messages');
const chatForm = document.querySelector('#chat-form');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');

console.log('test');

const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});
console.log(username, room);
socket.emit('joinRoom', { username, room });

socket.on('roomUsers', ({ room, users }) => {
  // outputRoomName(room);
  outputUsers(users);
});

chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const msg = e.target.elements.msg.value;
  socket.emit('chatMessage', msg);
  e.target.elements.msg.value = '';
  e.target.elements.msg.focus();
});

socket.on('message', ({ user, text, date }) => {
  const div = document.createElement('div');
  div.classList.add('message');
  div.innerHTML = `<p class="meta">${user} <span>${date}</span></p>
          <p class="text">
            ${text}
          </p>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// function outputRoomName(room) {
//   roomName.innerText = '#' + room;
// }

function outputUsers(users) {
  userList.innerHTML = `
    ${users.map(user => `<li>${user.username}</li>`).join('')}
    `;
}
