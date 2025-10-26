const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const DEFAULT_LEVEL = 'level1';
const levelCache = new Map();

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

function loadLevel(levelName) {
  if (!levelCache.has(levelName)) {
    const levelPath = path.join(__dirname, 'public', 'levels', `${levelName}.json`);
    try {
      const parsed = JSON.parse(fs.readFileSync(levelPath, 'utf8'));
      levelCache.set(levelName, parsed);
    } catch (error) {
      console.error(`Failed to load level ${levelName}:`, error);
      levelCache.set(levelName, null);
    }
  }
  return levelCache.get(levelName);
}

function getWorld(name, levelName = DEFAULT_LEVEL) {
  if (!worlds.has(name)) {
    const level = loadLevel(levelName) || { collectibles: [] };
    const collectibleMap = new Map();
    (level.collectibles || []).forEach((item) => {
      if (!item.id) {
        return;
      }
      collectibleMap.set(item.id, { ...item, collected: false });
    });

    worlds.set(name, {
      players: {},
      collectibles: collectibleMap,
      levelName,
    });
  }
  return worlds.get(name);
}

io.on('connection', (socket) => {
  socket.on('joinWorld', ({ worldName, player, levelName = DEFAULT_LEVEL }) => {
    if (!worldName || !player) return;

    const world = getWorld(worldName, levelName);
    const playerState = {
      ...player,
      id: socket.id,
      lastUpdate: Date.now(),
      score: typeof player.score === 'number' ? player.score : 0,
    };

    world.players[socket.id] = playerState;
    socket.join(worldName);
    socket.data.worldName = worldName;

    socket.emit('worldData', {
      players: Object.values(world.players),
      collectibles: Array.from(world.collectibles.values()),
      levelName: world.levelName,
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

  socket.on('collectItem', ({ collectibleId }) => {
    const worldName = socket.data.worldName;
    if (!worldName || !collectibleId) return;

    const world = worlds.get(worldName);
    if (!world) return;

    const collectible = world.collectibles.get(collectibleId);
    if (!collectible || collectible.collected) return;

    const player = world.players[socket.id];
    if (!player) return;

    collectible.collected = true;
    collectible.collectedBy = socket.id;

    const isGood = Array.isArray(collectible.tags) && collectible.tags.includes('good');
    const isBad = Array.isArray(collectible.tags) && collectible.tags.includes('bad');
    const delta = isGood ? 1 : isBad ? -1 : 0;

    const updatedScore = (player.score || 0) + delta;
    world.players[socket.id] = {
      ...player,
      score: updatedScore,
      lastUpdate: Date.now(),
    };

    io.to(worldName).emit('itemCollected', {
      id: collectibleId,
      by: socket.id,
      score: updatedScore,
      delta,
    });
  });
});

server.listen(PORT, () => {
  console.log(`Oakley's World server running on http://localhost:${PORT}`);
});
