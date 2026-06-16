const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDb } = require('./db');
const { authenticateSocket } = require('./auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

initDb();

const activeUsers = new Map();

app.use('/api/auth', require('./routes/auth'));
app.use('/api/servers', require('./routes/servers'));
app.use('/api/channels', require('./routes/channels'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/users', require('./routes/users'));

io.use(authenticateSocket);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.username}`);
  activeUsers.set(socket.user.id, { socketId: socket.id, username: socket.user.username });
  io.emit('users:online', Array.from(activeUsers.keys()));

  socket.on('join:server', (serverId) => {
    socket.join(`server:${serverId}`);
  });

  socket.on('join:channel', (channelId) => {
    socket.join(`channel:${channelId}`);
  });

  socket.on('join:dm', (dmId) => {
    socket.join(`dm:${dmId}`);
  });

  socket.on('message:send', (data) => {
    io.to(`channel:${data.channel_id}`).emit('message:new', data);
  });

  socket.on('dm:send', (data) => {
    io.to(`dm:${data.dm_id}`).emit('dm:new', data);
  });

  socket.on('message:delete', (data) => {
    io.to(`channel:${data.channel_id}`).emit('message:removed', data);
  });

  socket.on('typing:start', (data) => {
    socket.to(`channel:${data.channel_id}`).emit('typing:update', { user: socket.user.username, channel_id: data.channel_id, typing: true });
  });

  socket.on('typing:stop', (data) => {
    socket.to(`channel:${data.channel_id}`).emit('typing:update', { user: socket.user.username, channel_id: data.channel_id, typing: false });
  });

  socket.on('call:offer', (data) => {
    socket.to(data.targetId).emit('call:offer', { offer: data.offer, from: socket.user.id, fromUsername: socket.user.username });
  });

  socket.on('call:answer', (data) => {
    socket.to(data.targetId).emit('call:answer', { answer: data.answer, from: socket.user.id });
  });

  socket.on('call:ice-candidate', (data) => {
    socket.to(data.targetId).emit('call:ice-candidate', { candidate: data.candidate, from: socket.user.id });
  });

  socket.on('call:start', (data) => {
    socket.to(data.targetId).emit('call:incoming', { from: socket.user.id, fromUsername: socket.user.username, type: data.type || 'audio' });
  });

  socket.on('call:end', (data) => {
    socket.to(data.targetId).emit('call:ended', { from: socket.user.id });
  });

  socket.on('call:accept', (data) => {
    socket.to(data.targetId).emit('call:accepted', { from: socket.user.id });
  });

  socket.on('call:reject', (data) => {
    socket.to(data.targetId).emit('call:rejected', { from: socket.user.id });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.username}`);
    activeUsers.delete(socket.user.id);
    io.emit('users:online', Array.from(activeUsers.keys()));
  });
});

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
