(() => {
  const COOKIE_NAME = 'oakleyDog';
  const COOKIE_MAX_AGE_DAYS = 365;
  const DEFAULT_LEVEL = 'level1';

  const FUR_COLORS = [
    { value: '#c68642', label: 'Cinnamon' },
    { value: '#8d5524', label: 'Chocolate' },
    { value: '#f2d2b6', label: 'Cream' },
    { value: '#d1b38b', label: 'Caramel' },
    { value: '#495057', label: 'Shadow' },
    { value: '#f5e6d3', label: 'Snowy' },
  ];

  const COLLAR_COLORS = [
    { value: '#ff6b6b', label: 'Cherry' },
    { value: '#4dabf7', label: 'Sky' },
    { value: '#63e6be', label: 'Mint' },
    { value: '#ffd43b', label: 'Sunshine' },
    { value: '#845ef7', label: 'Violet' },
    { value: '#ffa94d', label: 'Tangerine' },
  ];

  const HAT_CHOICES = [
    { value: 'none', label: 'No Hat' },
    { value: 'party', label: 'Party Hat' },
    { value: 'beret', label: 'Artist Beret' },
    { value: 'cowboy', label: 'Cowboy Hat' },
    { value: 'crown', label: 'Golden Crown' },
  ];

  const RANDOM_NAMES = [
    'Oakley', 'Luna', 'Charlie', 'Bailey', 'Scout', 'Harley', 'Mochi', 'Pepper', 'Ziggy', 'Sunny',
  ];

  const welcomeScreen = document.getElementById('welcome-screen');
  const customizeScreen = document.getElementById('customize-screen');
  const gameScreen = document.getElementById('game-screen');
  const worldNameInput = document.getElementById('world-name');
  const customizeBtn = document.getElementById('customize-btn');
  const joinBtn = document.getElementById('join-btn');
  const customizeForm = document.getElementById('customize-form');
  const dogNameInput = document.getElementById('dog-name');
  const dogColorSelect = document.getElementById('dog-color');
  const collarSelect = document.getElementById('dog-collar');
  const hatSelect = document.getElementById('dog-hat');
  const randomizeBtn = document.getElementById('randomize-btn');
  const cancelCustomizeBtn = document.getElementById('cancel-customize');
  const previewCanvas = document.getElementById('preview-canvas');
  const previewCtx = previewCanvas.getContext('2d');
  const gameCanvas = document.getElementById('game-canvas');
  const gameCtx = gameCanvas.getContext('2d');
  const hud = document.getElementById('hud');

  const state = {
    dog: null,
    socket: null,
    level: null,
    worldName: null,
    players: new Map(),
    collectibles: new Map(),
    localId: null,
    keys: { up: false, down: false, left: false, right: false, space: false },
    lastNetworkSend: 0,
    camera: { x: 0, y: 0 },
    levelName: DEFAULT_LEVEL,
    hudMessage: '',
    messageTimeout: null,
  };

  function populateSelect(select, options) {
    select.innerHTML = '';
    options.forEach(({ value, label }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
  }

  function setCookie(name, value) {
    const expires = new Date();
    expires.setDate(expires.getDate() + COOKIE_MAX_AGE_DAYS);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`; // store cookie for the whole site
  }

  function getCookie(name) {
    const cookies = document.cookie.split(';').map((chunk) => chunk.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith(`${name}=`)) {
        return decodeURIComponent(cookie.substring(name.length + 1));
      }
    }
    return null;
  }

  function loadDogFromCookie() {
    const raw = getCookie(COOKIE_NAME);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.name || !parsed.color || !parsed.collar || !parsed.hat) {
        return null;
      }
      return parsed;
    } catch (err) {
      console.warn('Failed to parse saved dog, ignoring cookie.', err);
      return null;
    }
  }

  function saveDog(dog) {
    setCookie(COOKIE_NAME, JSON.stringify(dog));
    state.dog = dog;
  }

  function randomValue(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function randomDog() {
    return {
      name: randomValue(RANDOM_NAMES),
      color: randomValue(FUR_COLORS).value,
      collar: randomValue(COLLAR_COLORS).value,
      hat: randomValue(HAT_CHOICES).value,
    };
  }

  function drawDog(ctx, dog, x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Body
    ctx.fillStyle = dog.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 36, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.ellipse(32, -6, 18, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ear
    ctx.beginPath();
    ctx.moveTo(24, -18);
    ctx.quadraticCurveTo(18, -36, 8, -18);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(40, -20);
    ctx.quadraticCurveTo(38, -40, 26, -22);
    ctx.closePath();
    ctx.fill();

    // Collar
    ctx.fillStyle = dog.collar;
    ctx.fillRect(22, 2, 20, 6);

    // Nose
    ctx.fillStyle = '#2f2f2f';
    ctx.beginPath();
    ctx.arc(45, -6, 4, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.beginPath();
    ctx.arc(36, -8, 3, 0, Math.PI * 2);
    ctx.fill();

    drawHat(ctx, dog.hat);
    ctx.restore();
  }

  function drawHat(ctx, hat) {
    if (hat === 'none') return;

    ctx.save();
    ctx.translate(32, -24);
    switch (hat) {
      case 'party':
        ctx.fillStyle = '#ff9aa2';
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(-14, 6);
        ctx.lineTo(14, 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, -24, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'beret':
        ctx.fillStyle = '#495057';
        ctx.beginPath();
        ctx.ellipse(0, -2, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-2, -12, 4, 10);
        break;
      case 'cowboy':
        ctx.fillStyle = '#cc8f52';
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-12, -8, 24, 6);
        break;
      case 'crown':
        ctx.fillStyle = '#ffd43b';
        ctx.beginPath();
        ctx.moveTo(-16, 6);
        ctx.lineTo(-8, -12);
        ctx.lineTo(0, 6);
        ctx.lineTo(8, -12);
        ctx.lineTo(16, 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.arc(-8, -12, 3, 0, Math.PI * 2);
        ctx.arc(8, -12, 3, 0, Math.PI * 2);
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    ctx.restore();
  }

  function renderPreview(dog) {
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    previewCtx.save();
    previewCtx.translate(previewCanvas.width / 2 - 60, previewCanvas.height / 2 + 40);
    drawDog(previewCtx, dog, 0, 0, 1.2);
    previewCtx.restore();
  }

  function showScreen(target) {
    welcomeScreen.classList.toggle('hidden', target !== 'welcome');
    customizeScreen.classList.toggle('hidden', target !== 'customize');
    gameScreen.classList.toggle('hidden', target !== 'game');
  }

  function ensureDogConfig() {
    if (!state.dog) {
      state.dog = randomDog();
    }
    return state.dog;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function refreshHud() {
    const parts = [];
    if (state.worldName) {
      parts.push(`World: ${state.worldName}`);
    }
    if (state.dog) {
      parts.push(`Pup: ${state.dog.name}`);
    }
    const score = state.players.get(state.localId)?.score ?? 0;
    parts.push(`Score: ${score}`);
    parts.push('Move: WASD/Arrows');
    parts.push('Snack: Space');
    if (state.hudMessage) {
      parts.push(state.hudMessage);
    }
    hud.textContent = parts.join(' | ');
  }

  function setHudMessage(message, duration = 0) {
    state.hudMessage = message || '';
    if (state.messageTimeout) {
      clearTimeout(state.messageTimeout);
      state.messageTimeout = null;
    }
    if (duration > 0 && message) {
      state.messageTimeout = window.setTimeout(() => {
        state.hudMessage = '';
        state.messageTimeout = null;
        refreshHud();
      }, duration);
    }
    refreshHud();
  }

  function attachKeyHandlers() {
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        if (!state.keys.space) {
          state.keys.space = true;
          attemptCollect();
        }
        event.preventDefault();
        return;
      }
      switch (event.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          state.keys.up = true;
          break;
        case 'arrowdown':
        case 's':
          state.keys.down = true;
          break;
        case 'arrowleft':
        case 'a':
          state.keys.left = true;
          break;
        case 'arrowright':
        case 'd':
          state.keys.right = true;
          break;
        default:
          return;
      }
      event.preventDefault();
    });

    window.addEventListener('keyup', (event) => {
      if (event.code === 'Space') {
        state.keys.space = false;
        event.preventDefault();
        return;
      }
      switch (event.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          state.keys.up = false;
          break;
        case 'arrowdown':
        case 's':
          state.keys.down = false;
          break;
        case 'arrowleft':
        case 'a':
          state.keys.left = false;
          break;
        case 'arrowright':
        case 'd':
          state.keys.right = false;
          break;
        default:
          return;
      }
      event.preventDefault();
    });
  }

  function fetchLevel() {
    const levelUrl = `levels/${DEFAULT_LEVEL}.json`;
    return fetch(levelUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load level file.');
        }
        return response.json();
      })
      .then((level) => {
        state.level = level;
        state.levelName = DEFAULT_LEVEL;
        return level;
      });
  }

  function startSocket(worldName, player) {
    state.worldName = worldName;
    const socket = io();
    state.socket = socket;

    socket.on('connect', () => {
      state.localId = socket.id;
      socket.emit('joinWorld', { worldName, player, levelName: state.levelName });
      state.players.set(socket.id, { ...player, id: socket.id, score: player.score ?? 0 });
      setHudMessage('Connected!', 1500);
    });

    socket.on('worldData', ({ players, collectibles, levelName }) => {
      state.players = new Map(
        (players || []).map((p) => [p.id, { ...p, score: typeof p.score === 'number' ? p.score : 0 }])
      );
      state.collectibles = new Map(
        (collectibles || []).map((item) => [item.id, { ...item }])
      );
      if (levelName) {
        state.levelName = levelName;
      }
      refreshHud();
    });

    socket.on('playerJoined', (playerInfo) => {
      state.players.set(playerInfo.id, {
        ...playerInfo,
        score: typeof playerInfo.score === 'number' ? playerInfo.score : 0,
      });
      refreshHud();
    });

    socket.on('playerMoved', (playerInfo) => {
      const existing = state.players.get(playerInfo.id);
      if (existing) {
        const nextScore =
          typeof playerInfo.score === 'number' ? playerInfo.score : existing.score;
        state.players.set(playerInfo.id, { ...existing, ...playerInfo, score: nextScore });
      } else {
        state.players.set(playerInfo.id, {
          ...playerInfo,
          score: typeof playerInfo.score === 'number' ? playerInfo.score : 0,
        });
      }
    });

    socket.on('playerLeft', ({ id }) => {
      state.players.delete(id);
      refreshHud();
    });

    socket.on('itemCollected', ({ id, by, score, delta }) => {
      const collectible = state.collectibles.get(id);
      if (collectible) {
        state.collectibles.set(id, { ...collectible, collected: true, collectedBy: by });
      }

      const collector = state.players.get(by);
      if (collector) {
        const updated = { ...collector, score: typeof score === 'number' ? score : collector.score };
        state.players.set(by, updated);
      }

      if (by === state.localId) {
        const itemName = collectible?.name || 'Treat';
        if (delta !== 0) {
          const sign = delta > 0 ? '+' : '';
          setHudMessage(`${itemName} ${sign}${delta}`, 1800);
        } else {
          refreshHud();
        }
      } else {
        refreshHud();
      }
    });
  }

  function updateLocalPlayer(delta, timestamp) {
    if (!state.localId) return;
    const player = state.players.get(state.localId);
    if (!player) return;

    const speed = 160;
    const vel = { x: 0, y: 0 };
    if (state.keys.up) vel.y -= 1;
    if (state.keys.down) vel.y += 1;
    if (state.keys.left) vel.x -= 1;
    if (state.keys.right) vel.x += 1;

    if (vel.x !== 0 || vel.y !== 0) {
      const len = Math.hypot(vel.x, vel.y) || 1;
      vel.x /= len;
      vel.y /= len;
      player.x += vel.x * speed * delta;
      player.y += vel.y * speed * delta;
      player.facing = Math.atan2(vel.y, vel.x);
    }

    const bounds = state.level?.bounds;
    if (bounds) {
      player.x = clamp(player.x, 40, bounds.width - 40);
      player.y = clamp(player.y, 40, bounds.height - 40);
    }

    state.players.set(state.localId, player);

    if (state.socket && state.socket.connected && timestamp - state.lastNetworkSend > 60) {
      state.socket.emit('updatePlayer', {
        x: player.x,
        y: player.y,
        facing: player.facing,
      });
      state.lastNetworkSend = timestamp;
    }
  }

  function attemptCollect() {
    if (!state.localId || !state.socket || !state.socket.connected) return;
    const player = state.players.get(state.localId);
    if (!player) return;

    let target = null;
    let closest = Infinity;
    for (const collectible of state.collectibles.values()) {
      if (!collectible || collectible.collected) continue;
      const radius = collectible.radius || collectible.width || 24;
      const reach = radius + 36;
      const dx = player.x - collectible.x;
      const dy = player.y - collectible.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= reach && distance < closest) {
        closest = distance;
        target = collectible;
      }
    }

    if (target) {
      state.socket.emit('collectItem', { collectibleId: target.id });
    }
  }

  function drawWorld() {
    gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    const local = state.players.get(state.localId);
    if (!local || !state.level) return;

    const bounds = state.level.bounds;
    const decorations = state.level.decorations || [];

    state.camera.x = clamp(local.x - gameCanvas.width / 2, 0, Math.max(0, bounds.width - gameCanvas.width));
    state.camera.y = clamp(local.y - gameCanvas.height / 2, 0, Math.max(0, bounds.height - gameCanvas.height));

    gameCtx.fillStyle = '#d8f3dc';
    gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

    gameCtx.save();
    gameCtx.translate(-state.camera.x, -state.camera.y);

    // Soft grid to help orientation
    gameCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    gameCtx.lineWidth = 1;
    for (let x = 0; x <= bounds.width; x += 80) {
      gameCtx.beginPath();
      gameCtx.moveTo(x, 0);
      gameCtx.lineTo(x, bounds.height);
      gameCtx.stroke();
    }
    for (let y = 0; y <= bounds.height; y += 80) {
      gameCtx.beginPath();
      gameCtx.moveTo(0, y);
      gameCtx.lineTo(bounds.width, y);
      gameCtx.stroke();
    }

    // Decorations from JSON (circles for now for easy editing)
    decorations.forEach((decor) => {
      gameCtx.fillStyle = decor.color || '#a7c957';
      gameCtx.beginPath();
      gameCtx.ellipse(decor.x, decor.y, decor.width || decor.radius || 40, decor.height || decor.radius || 40, 0, 0, Math.PI * 2);
      gameCtx.fill();
    });

    for (const collectible of state.collectibles.values()) {
      if (!collectible || collectible.collected) continue;
      const radius = collectible.radius || 22;
      const baseColor = collectible.color || (collectible.tags?.includes('bad') ? '#ff6b6b' : '#74c69d');
      gameCtx.fillStyle = baseColor;
      gameCtx.beginPath();
      gameCtx.ellipse(collectible.x, collectible.y, radius, radius * 0.75, 0, 0, Math.PI * 2);
      gameCtx.fill();

      if (collectible.outlineColor) {
        gameCtx.strokeStyle = collectible.outlineColor;
        gameCtx.lineWidth = 2;
        gameCtx.stroke();
      }

      gameCtx.fillStyle = '#1d3557';
      gameCtx.font = '14px Trebuchet MS';
      gameCtx.textAlign = 'center';
      const label = collectible.shortName || collectible.name || collectible.id || 'Treat';
      gameCtx.fillText(label, collectible.x, collectible.y - radius - 4);
    }

    for (const player of state.players.values()) {
      drawDog(gameCtx, player, player.x, player.y, 1);
      gameCtx.fillStyle = '#1d3557';
      gameCtx.font = '16px Trebuchet MS';
      gameCtx.textAlign = 'center';
      gameCtx.fillText(player.name, player.x + 18, player.y - 40);
    }

    gameCtx.restore();
  }

  function gameLoop(timestamp) {
    if (state.localId) {
      const now = timestamp;
      const delta = state._lastFrame ? (now - state._lastFrame) / 1000 : 0;
      updateLocalPlayer(delta, now);
      drawWorld();
      state._lastFrame = now;
    }
    requestAnimationFrame(gameLoop);
  }

  function setDogForm(dog) {
    dogNameInput.value = dog.name;
    dogColorSelect.value = dog.color;
    collarSelect.value = dog.collar;
    if (!HAT_CHOICES.some((choice) => choice.value === dog.hat)) {
      dog.hat = 'none';
    }
    hatSelect.value = dog.hat;
    renderPreview(dog);
  }

  function handleCustomizeSave(event) {
    event.preventDefault();
    const dog = {
      name: dogNameInput.value.trim() || 'Oakley',
      color: dogColorSelect.value,
      collar: collarSelect.value,
      hat: hatSelect.value,
    };
    saveDog(dog);
    showScreen('welcome');
    refreshHud();
  }

  function handleJoin() {
    const world = worldNameInput.value.trim().toLowerCase();
    if (!world) {
      worldNameInput.focus();
      worldNameInput.classList.add('shake');
      setTimeout(() => worldNameInput.classList.remove('shake'), 400);
      return;
    }

    ensureDogConfig();
    const levelPromise = state.level ? Promise.resolve(state.level) : fetchLevel();

    levelPromise
      .then((level) => {
        const spawn = level.spawn || { x: 200, y: 200 };
        const player = {
          ...state.dog,
          x: spawn.x + Math.random() * 60 - 30,
          y: spawn.y + Math.random() * 60 - 30,
          facing: 0,
          score: 0,
        };
        state.players = new Map();
        state.collectibles = new Map();
        showScreen('game');
        setHudMessage('Connecting...');
        startSocket(world, player);
      })
      .catch((err) => {
        console.error(err);
        alert('Could not load the world. Please try again later.');
      });
  }

  function initCustomizer() {
    customizeBtn.addEventListener('click', () => {
      ensureDogConfig();
      setDogForm(state.dog);
      showScreen('customize');
    });

    cancelCustomizeBtn.addEventListener('click', () => {
      showScreen('welcome');
    });

    customizeForm.addEventListener('submit', handleCustomizeSave);

    [dogNameInput, dogColorSelect, collarSelect, hatSelect].forEach((element) => {
      element.addEventListener('input', () => {
        const currentDog = {
          name: dogNameInput.value.trim() || 'Oakley',
          color: dogColorSelect.value,
          collar: collarSelect.value,
          hat: hatSelect.value,
        };
        renderPreview(currentDog);
      });
    });

    randomizeBtn.addEventListener('click', () => {
      const dog = randomDog();
      setDogForm(dog);
    });
  }

  function init() {
    populateSelect(dogColorSelect, FUR_COLORS);
    populateSelect(collarSelect, COLLAR_COLORS);
    populateSelect(hatSelect, HAT_CHOICES);

    const savedDog = loadDogFromCookie();
    if (savedDog) {
      state.dog = savedDog;
      setDogForm(savedDog);
    } else {
      const dog = randomDog();
      state.dog = dog;
      setDogForm(dog);
    }

    initCustomizer();

    joinBtn.addEventListener('click', handleJoin);

    attachKeyHandlers();

    refreshHud();
    requestAnimationFrame(gameLoop);
  }

  init();
})();
