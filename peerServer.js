const http = require('http');
const express = require('express');
const { ExpressPeerServer } = require('peer');

const app = express();
const server = http.createServer(app);
const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.use('/peerjs', peerServer);

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`PeerJS server is running on port ${PORT}`);
});
