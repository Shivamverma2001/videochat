const socket = io();
const peer = new Peer(undefined, {
  host: '/',
  port: '3001',
  path: '/peerjs',
});

let localStream;
let myPeerId;
let myUsername;
let currentRoom;

const usernameInput = document.getElementById('usernameInput');
const roomInput = document.getElementById('roomInput');
const startRoomButton = document.getElementById('startRoomButton');
const joinRoomButton = document.getElementById('joinRoomButton');
const roomIdDisplay = document.getElementById('roomIdDisplay');
const userIdDisplay = document.getElementById('userIdDisplay');
const videoGrid = document.getElementById('video-grid');

// Initialize PeerJS
peer.on('open', id => {
  myPeerId = id;
  userIdDisplay.textContent = `Your ID: ${myPeerId}`;
});

// Handle incoming calls
peer.on('call', call => {
  call.answer(localStream);
  call.on('stream', remoteStream => {
    addVideoStream(remoteStream, call.peer);
  });
});

// Add video stream to the page
function addVideoStream(stream, id) {
  let video = document.getElementById(id);
  if (!video) {
    video = document.createElement('video');
    video.id = id;
    video.autoplay = true;
    video.controls = false;
    videoGrid.appendChild(video);
  }
  video.srcObject = stream;
}

// Start a new room
startRoomButton.addEventListener('click', async () => {
  const username = usernameInput.value;
  const roomId = roomInput.value;

  if (username && roomId) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      addVideoStream(localStream, myPeerId); 
      myUsername = username;
      currentRoom = roomId;
      socket.emit('start-room', { roomId, username });
      roomIdDisplay.textContent = `Room ID: ${roomId}`;
    } catch (error) {
      console.error('Error accessing media devices.', error);
    }
  }
});

// Join an existing room
joinRoomButton.addEventListener('click', async () => {
  const username = usernameInput.value;
  const roomId = roomInput.value;

  if (username && roomId) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      addVideoStream(localStream, myPeerId); 
      myUsername = username;
      currentRoom = roomId;
      socket.emit('join-room', { roomId, username });
      roomIdDisplay.textContent = `Room ID: ${roomId}`;
    } catch (error) {
      console.error('Error accessing media devices.', error);
    }
  }
});

// Handle new user connections
socket.on('user-connected', ({ userId, username }) => {
  console.log(`${username} connected with ID ${userId}`);
  const call = peer.call(userId, localStream);
  call.on('stream', remoteStream => {
    addVideoStream(remoteStream, userId); 
  });
});

// Handle room creation and joining
socket.on('room-started', ({ roomId, username }) => {
  console.log(`Room ${roomId} started by ${username}`);
});

socket.on('room-joined', ({ roomId, username }) => {
  console.log(`Joined room ${roomId} successfully. Room creator: ${username}`);
  socket.emit('user-joined', { roomId, username, userId: myPeerId });
});

// Handle new user joined event
socket.on('user-joined', ({ userId, username }) => {
  console.log(`${username} joined room with ID ${userId}`);
  const call = peer.call(userId, localStream);
  call.on('stream', remoteStream => {
    addVideoStream(remoteStream, userId);
  });
});

// Handle user disconnections
socket.on('user-disconnected', userId => {
  console.log(`User disconnected: ${userId}`);
  const video = document.getElementById(userId);
  if (video) {
    video.remove();
  }
});
