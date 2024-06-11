const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

const groups = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('createGroup', ({ groupName, pin }) => {
    groups[pin] = { groupName, members: [] };
    socket.emit('groupCreated', { groupName, pin });
    console.log(`Group created: ${groupName} with PIN: ${pin}`);
  });

  socket.on('joinGroup', ({ username, pin }) => {
    const group = groups[pin];
    if (group) {
      group.members.push({ id: socket.id, username });
      socket.join(pin);
      socket.emit('joinedGroup', { groupName: group.groupName, pin });
      io.to(pin).emit('message', { username: 'System', text: `${username} has joined the group.` });
      console.log(`${username} joined group: ${group.groupName} with PIN: ${pin}`);
    } else {
      socket.emit('error', 'Invalid PIN');
    }
  });

  socket.on('sendMessage', ({ pin, message, username }) => {
    io.to(pin).emit('message', { username, text: message });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    for (const pin in groups) {
      const group = groups[pin];
      const memberIndex = group.members.findIndex(member => member.id === socket.id);
      if (memberIndex !== -1) {
        const [member] = group.members.splice(memberIndex, 1);
        io.to(pin).emit('message', { username: 'System', text: `${member.username} has left the group.` });
        console.log(`${member.username} left group: ${group.groupName} with PIN: ${pin}`);
        if (group.members.length === 0) {
          delete groups[pin];
          console.log(`Group deleted: ${group.groupName} with PIN: ${pin}`);
        }
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
