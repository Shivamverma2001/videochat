const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { ExpressPeerServer } = require('peer');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/peerjs'
});

app.use('/peerjs', peerServer);

const rooms = {};

io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`);

  socket.on('start-room', ({ roomId, username }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { users: {} };
    }
    rooms[roomId].users[socket.id] = username;
    socket.join(roomId);
    console.log(`Room started: ${roomId} by user: ${username}`);
    socket.emit('room-started', { roomId, username });
  });

  socket.on('join-room', ({ roomId, username }) => {
    if (rooms[roomId]) {
      rooms[roomId].users[socket.id] = username;
      socket.join(roomId);
      console.log(`User ${username} joined room: ${roomId}`);
      socket.emit('room-joined', { roomId, username });
      socket.to(roomId).emit('user-connected', { userId: socket.id, username });
    } else {
      console.log(`Room not found: ${roomId} for user: ${username}`);
    }
  });

  socket.on('user-joined', ({ roomId, username, userId }) => {
    if (rooms[roomId]) {
      rooms[roomId].users[userId] = username;
      socket.to(roomId).emit('user-joined', { userId, username });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    for (const roomId in rooms) {
      if (rooms[roomId].users[socket.id]) {
        delete rooms[roomId].users[socket.id];
        socket.to(roomId).emit('user-disconnected', socket.id);
      }
    }
  });
});

app.use(express.static('public'));

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
