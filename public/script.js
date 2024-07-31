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
let isRoomCreator = false;

// Elements
const usernameInput = document.getElementById('usernameInput');
const roomInput = document.getElementById('roomInput');
const startRoomButton = document.getElementById('startRoomButton');
const joinRoomButton = document.getElementById('joinRoomButton');
const disconnectButton = document.getElementById('disconnectButton');
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
  if (localStream) {
    call.answer(localStream);
    call.on('stream', remoteStream => {
      addVideoStream(remoteStream, call.peer, 'Remote User');
    });
  }
});

// Add video stream to the page
function addVideoStream(stream, id, username) {
  let videoContainer = document.getElementById(id);
  if (!videoContainer) {
    videoContainer = document.createElement('div');
    videoContainer.id = id;
    videoContainer.classList.add('video-container');

    const video = document.createElement('video');
    video.autoplay = true;
    video.controls = false;

    const usernameOverlay = document.createElement('div');
    usernameOverlay.classList.add('username');
    usernameOverlay.textContent = username;

    videoContainer.appendChild(video);
    videoContainer.appendChild(usernameOverlay);
    videoGrid.appendChild(videoContainer);
  }

  videoContainer.querySelector('video').srcObject = stream;
}

// Remove video stream from the page
function removeVideoStream(id) {
  const videoContainer = document.getElementById(id);
  if (videoContainer) {
    videoContainer.remove();
  }
}

// Start a new room
startRoomButton.addEventListener('click', async () => {
  const username = usernameInput.value;
  const roomId = roomInput.value;

  if (username && roomId) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      addVideoStream(localStream, myPeerId, username); // Add local stream with username
      myUsername = username;
      currentRoom = roomId;
      isRoomCreator = true;
      socket.emit('start-room', { roomId, username });
      roomIdDisplay.textContent = `Room ID: ${roomId}`;
      disconnectButton.style.display = 'block';
    } catch (error) {
      console.error('Error accessing media devices.', error);
    }
  } else {
    showError('Please enter both username and room name.');
  }
});

// Join an existing room
joinRoomButton.addEventListener('click', async () => {
  const username = usernameInput.value;
  const roomId = roomInput.value;

  if (username && roomId) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      addVideoStream(localStream, myPeerId, username); // Add local stream with username
      myUsername = username;
      currentRoom = roomId;
      isRoomCreator = false;
      socket.emit('join-room', { roomId, username });
      roomIdDisplay.textContent = `Room ID: ${roomId}`;
      disconnectButton.style.display = 'block';
    } catch (error) {
      console.error('Error accessing media devices.', error);
    }
  } else {
    showError('Please enter both username and room name.');
  }
});

// Disconnect button logic
disconnectButton.addEventListener('click', () => {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  peer.destroy();
  document.querySelectorAll('.video-container').forEach(container => container.remove());
  socket.emit('end-room', currentRoom); // Inform server to close room
  disconnectButton.style.display = 'none';
  roomIdDisplay.textContent = '';
  userIdDisplay.textContent = '';
});

// Handle new user connections
socket.on('user-connected', ({ userId, username }) => {
  console.log(`${username} connected with ID ${userId}`);
  if (localStream) {
    const call = peer.call(userId, localStream);
    call.on('stream', remoteStream => {
      addVideoStream(remoteStream, userId, username);
    });
  }
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
  if (localStream) {
    const call = peer.call(userId, localStream);
    call.on('stream', remoteStream => {
      addVideoStream(remoteStream, userId, username);
    });
  }
});

// Handle user disconnections
socket.on('user-disconnected', userId => {
  console.log(`User disconnected: ${userId}`);
  removeVideoStream(userId);
});

// Handle room closure
socket.on('room-closed', () => {
  console.log('Room closed by creator');
  document.querySelectorAll('.video-container').forEach(container => container.remove());
  disconnectButton.style.display = 'none';
});

// Handle room not found error
socket.on('room-not-found', ({ roomId }) => {
  console.log(`Room not found: ${roomId}`);
  showError('Room not found. Please check the room name.');
  // Remove local stream if room not found
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  document.querySelectorAll('.video-container').forEach(container => container.remove());
  disconnectButton.style.display = 'none';
  roomIdDisplay.textContent = '';
  userIdDisplay.textContent = '';
});
