const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files for the client
app.use(express.static(path.join(__dirname, 'public')));

// Simple level loader so new JSON files just work without code changes
app.get('/levels/:levelName', (req, res) => {
  const levelPath = path.join(__dirname, 'public', 'levels', `${req.params.levelName}.json`);
  fs.readFile(levelPath, 'utf8', (err, data) => {
    if (err) {
      res.status(404).json({ error: 'Level not found' });
      return;
    }
    res.type('application/json').send(data);
  });
});

// In-memory world state keyed by world name
const worlds = new Map();

function getWorld(name) {
  if (!worlds.has(name)) {
    worlds.set(name, { players: {} });
  }
  return worlds.get(name);
}

io.on('connection', (socket) => {
  socket.on('joinWorld', ({ worldName, player }) => {
    if (!worldName || !player) return;

    const world = getWorld(worldName);
    const playerState = {
      ...player,
      id: socket.id,
      lastUpdate: Date.now(),
    };

    world.players[socket.id] = playerState;
    socket.join(worldName);
    socket.data.worldName = worldName;

    socket.emit('worldData', {
      players: Object.values(world.players),
    });

    socket.to(worldName).emit('playerJoined', playerState);
  });

  socket.on('updatePlayer', (state) => {
    const worldName = socket.data.worldName;
    if (!worldName) return;

    const world = worlds.get(worldName);
    if (!world) return;

    const player = world.players[socket.id];
    if (!player) return;

    world.players[socket.id] = {
      ...player,
      ...state,
      id: socket.id,
      lastUpdate: Date.now(),
    };

    socket.to(worldName).emit('playerMoved', world.players[socket.id]);
  });

  socket.on('disconnect', () => {
    const worldName = socket.data.worldName;
    if (!worldName) return;

    const world = worlds.get(worldName);
    if (!world) return;

    delete world.players[socket.id];
    socket.to(worldName).emit('playerLeft', { id: socket.id });

    if (Object.keys(world.players).length === 0) {
      worlds.delete(worldName);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Oakley's World server running on http://localhost:${PORT}`);
});
