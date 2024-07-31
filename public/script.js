// Connect to the main server using Socket.IO
const socket = io();

const peer = new Peer(undefined, {
  host: 'localhost',
  port: 3001,
  path: '/peerjs'
});

// Elements
const startRoomButton = document.getElementById('startRoomButton');
const joinRoomButton = document.getElementById('joinRoomButton');
const roomInput = document.getElementById('roomInput');
const usernameInput = document.getElementById('usernameInput');
const videoGrid = document.getElementById('video-grid');

let myPeerId;
let myStream;

// Get user's media
navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
  myStream = stream;
  // Display own video
  const video = document.createElement('video');
  video.srcObject = stream;
  video.play();
  videoGrid.append(video);

  peer.on('call', call => {
    call.answer(stream); // Answer the call with the local stream
    const video = document.createElement('video');
    call.on('stream', remoteStream => {
      video.srcObject = remoteStream;
      video.play();
      videoGrid.append(video);
    });
  });
});

peer.on('open', id => {
  myPeerId = id;
  console.log('My peer ID is: ', id);
});

startRoomButton.addEventListener('click', () => {
  const roomId = roomInput.value;
  const userId = myPeerId;
  if (roomId) {
    socket.emit('start-room', roomId, userId);
    console.log(`Room started: ${roomId} by user: ${userId}`);
  }
});

joinRoomButton.addEventListener('click', () => {
  const roomId = roomInput.value;
  const userId = myPeerId;
  if (roomId) {
    socket.emit('join-room', roomId, userId);
    console.log(`User joined room: ${roomId} - user: ${userId}`);
  }
});

socket.on('room-joined', roomId => {
  console.log(`Successfully joined room: ${roomId}`);
});

socket.on('user-connected', userId => {
  console.log(`User connected: ${userId}`);
  const call = peer.call(userId, myStream);
  call.on('stream', remoteStream => {
    const video = document.createElement('video');
    video.srcObject = remoteStream;
    video.play();
    videoGrid.append(video);
  });
});

socket.on('user-disconnected', userId => {
  console.log(`User disconnected: ${userId}`);
  // Handle user disconnection if needed
});

socket.on('room-not-found', () => {
  console.log('Room not found');
});
