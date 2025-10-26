const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
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
      collectibleMap.set(item.id, {
        ...item,
        collected: false,
        claimedBy: null,
        claimedAt: null,
        timer: null,
        chewMs: null,
        collectedBy: null,
      });
    });

    worlds.set(name, {
      players: {},
      collectibles: collectibleMap,
      levelName,
    });
  }
  return worlds.get(name);
}

function getChewDurationMs(collectible) {
  const base = 2000;
  const tags = Array.isArray(collectible.tags) ? collectible.tags : [];
  const chewTag = tags.find((tag) => typeof tag === 'string' && tag.startsWith('chew:'));
  if (!chewTag) {
    return base;
  }

  switch (chewTag) {
    case 'chew:soft':
      return 1500;
    case 'chew:crunchy':
      return 2200;
    case 'chew:chewy':
      return 2600;
    case 'chew:hard':
      return 3200;
    case 'chew:tough':
      return 3800;
    default:
      return base;
  }
}

function finalizeCollect(worldName, collectibleId, socketId) {
  const world = worlds.get(worldName);
  if (!world) return;

  const collectible = world.collectibles.get(collectibleId);
  if (!collectible || collectible.collected) return;

  if (collectible.claimedBy !== socketId) {
    return;
  }

  collectible.claimedBy = null;
  collectible.claimedAt = null;
  collectible.chewMs = null;
  collectible.collected = true;
  collectible.collectedBy = socketId;
  if (collectible.timer) {
    clearTimeout(collectible.timer);
    collectible.timer = null;
  }

  const player = world.players[socketId];
  if (!player) {
    collectible.collected = false;
    collectible.collectedBy = null;
    io.to(worldName).emit('chewCancelled', { id: collectibleId });
    return;
  }

  const isGood = Array.isArray(collectible.tags) && collectible.tags.includes('good');
  const isBad = Array.isArray(collectible.tags) && collectible.tags.includes('bad');
  const delta = isGood ? 1 : isBad ? -1 : 0;

  const updatedScore = (player.score || 0) + delta;
  world.players[socketId] = {
    ...player,
    score: updatedScore,
    lastUpdate: Date.now(),
  };

  io.to(worldName).emit('itemCollected', {
    id: collectibleId,
    by: socketId,
    score: updatedScore,
    delta,
  });
}

function cancelChewsForPlayer(worldName, socketId) {
  const world = worlds.get(worldName);
  if (!world) return;

  for (const collectible of world.collectibles.values()) {
    if (collectible.claimedBy === socketId && !collectible.collected) {
      if (collectible.timer) {
        clearTimeout(collectible.timer);
        collectible.timer = null;
      }
      collectible.claimedBy = null;
      collectible.claimedAt = null;
      collectible.chewMs = null;
      collectible.collectedBy = null;
      io.to(worldName).emit('chewCancelled', { id: collectible.id });
    }
  }
}

function handleStartEating(socket, collectibleId, options = {}) {
  const worldName = socket.data.worldName;
  if (!worldName) return;

  const world = worlds.get(worldName);
  if (!world) return;

  const collectible = world.collectibles.get(collectibleId);
  if (!collectible || collectible.collected) {
    socket.emit('chewRejected', { id: collectibleId, reason: 'collected' });
    return;
  }

  if (collectible.claimedBy && collectible.claimedBy !== socket.id) {
    socket.emit('chewRejected', { id: collectibleId, reason: 'claimed' });
    return;
  }

  if (collectible.claimedBy === socket.id && !options.immediate) {
    socket.emit('chewRejected', { id: collectibleId, reason: 'in-progress' });
    return;
  }

  const player = world.players[socket.id];
  if (!player) {
    socket.emit('chewRejected', { id: collectibleId, reason: 'player-missing' });
    return;
  }

  if (collectible.timer) {
    clearTimeout(collectible.timer);
    collectible.timer = null;
  }

  const durationMs = options.immediate ? 0 : getChewDurationMs(collectible);
  collectible.claimedBy = socket.id;
  collectible.claimedAt = Date.now();
  collectible.chewMs = durationMs;
  collectible.collectedBy = null;

  if (durationMs > 0) {
    io.to(worldName).emit('chewStarted', {
      id: collectibleId,
      by: socket.id,
      duration: durationMs,
    });
  }

  if (durationMs === 0) {
    finalizeCollect(worldName, collectibleId, socket.id);
  } else {
    collectible.timer = setTimeout(() => {
      finalizeCollect(worldName, collectibleId, socket.id);
    }, durationMs);
  }
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

    cancelChewsForPlayer(worldName, socket.id);

    delete world.players[socket.id];
    socket.to(worldName).emit('playerLeft', { id: socket.id });

    if (Object.keys(world.players).length === 0) {
      worlds.delete(worldName);
    }
  });

  socket.on('collectItem', ({ collectibleId }) => {
    if (!collectibleId) return;
    handleStartEating(socket, collectibleId, { immediate: true });
  });

  socket.on('startEating', ({ collectibleId }) => {
    if (!collectibleId) return;
    handleStartEating(socket, collectibleId);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Oakley's World server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
