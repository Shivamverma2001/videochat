const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

const rooms = {}; // Track rooms and their users

io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`);

  socket.on('start-room', (roomId, userId) => {
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }
    rooms[roomId].push(userId);
    socket.join(roomId);
    console.log(`Room started: ${roomId} by user: ${userId}`);
    socket.emit('room-joined', roomId);
    socket.to(roomId).emit('user-connected', userId); // Broadcast to the room
  });

  socket.on('join-room', (roomId, userId) => {
    if (rooms[roomId]) {
      rooms[roomId].push(userId);
      socket.join(roomId);
      console.log(`User joined room: ${roomId} - user: ${userId}`);
      socket.emit('room-joined', roomId);
      socket.to(roomId).emit('user-connected', userId); // Broadcast to the room
    } else {
      console.log(`Room not found: ${roomId} for user: ${userId}`);
      socket.emit('room-not-found');
    }
  });

  socket.on('disconnect', () => {
    for (let roomId in rooms) {
      if (rooms[roomId].includes(socket.id)) {
        rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
        console.log(`User disconnected: ${socket.id} from room: ${roomId}`);
        socket.to(roomId).emit('user-disconnected', socket.id);
        if (rooms[roomId].length === 0) {
          delete rooms[roomId];
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
