const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { ExpressPeerServer } = require('peer');
const fs = require('fs'); // Required for handling file operations

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/peerjs'
});

app.use('/peerjs', peerServer);

const rooms = {}; // Store room details

io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`);

  let currentRoom; // Define currentRoom variable here

  socket.on('start-room', ({ roomId, username }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { users: {} };
    }
    rooms[roomId].users[socket.id] = username;
    currentRoom = roomId; // Set currentRoom
    socket.join(roomId);
    console.log(`Room started: ${roomId} by user: ${username}`);
    socket.emit('room-started', { roomId, username });
  });

  socket.on('join-room', ({ roomId, username }) => {
    if (rooms[roomId]) {
      rooms[roomId].users[socket.id] = username;
      currentRoom = roomId; // Set currentRoom
      socket.join(roomId);
      console.log(`User ${username} joined room: ${roomId}`);
      socket.emit('room-joined', { roomId, username });
      socket.to(roomId).emit('user-connected', { userId: socket.id, username });
    } else {
      console.log(`Room not found: ${roomId} for user: ${username}`);
      socket.emit('room-not-found', { roomId });
    }
  });

  socket.on('user-joined', ({ roomId, username, userId }) => {
    if (rooms[roomId]) {
      rooms[roomId].users[userId] = username;
      socket.to(roomId).emit('user-joined', { userId, username });
    }
  });

  socket.on('end-room', roomId => {
    console.log(`Room closed: ${roomId}`);
    if (rooms[roomId]) {
      io.to(roomId).emit('room-closed'); // Notify all users in the room
      delete rooms[roomId];
    }
  });

  socket.on('leave-room', roomId => {
    console.log(`User left room: ${roomId}`);
    if (rooms[roomId]) {
      delete rooms[roomId].users[socket.id];
      socket.to(roomId).emit('user-disconnected', socket.id);
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

  // Handle chat messages
  socket.on('chat-message', ({ message, username, roomId }) => {
    io.to(roomId).emit('chat-message', { message, username });
  });

  // Handle file uploads
  socket.on('file-message', ({ filename, fileData, username }) => {
    if (currentRoom) {
      io.to(currentRoom).emit('file-message', { filename, fileData, username });
    } else {
      console.error('No room specified for file upload');
    }
  });
});

app.use(express.static('public'));

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
