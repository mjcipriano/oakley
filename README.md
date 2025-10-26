# Oakley's World

Oakley's World is a lightweight multiplayer browser playground where every player is a dog. It is built with plain HTML5 Canvas, vanilla JavaScript, and a tiny Node.js + Socket.IO server so kids (and kids-at-heart) can tweak it easily.

## Features
- Friendly welcome screen with quick access to **Customize** or **Join**.
- Dog builder lets you pick a name, fur color, collar color, and fun hats. Choices are saved locally in cookies.
- Instant join button creates a random pup when no customization is stored.
- Multiplayer world synced via Socket.IO with simple broadcast updates.
- JSON-driven level data (`public/levels/level1.json`) keeps the world layout editable without touching code.
- Snackable collectibles with good/bad tags and a shared score that updates whenever pups chow down.

## Project Structure
```
OakleysWorld/
├─ server.js            # Express + Socket.IO server
└─ public/
   ├─ index.html        # Welcome screen and customization UI
   ├─ game.js           # Client-side logic & canvas rendering
   └─ levels/
      └─ level1.json    # Default world definition
```

## Getting Started
1. Install dependencies (package.json is provided):
   ```bash
   npm install express socket.io
   ```
2. Run the server:
   ```bash
   node server.js
   ```
3. Open the game at [http://localhost:3000](http://localhost:3000).

> **Node version note:** The project is tested with Node.js 18+. If you are on an older runtime, either upgrade Node or keep Express pinned to the 4.x line (the current `package.json` already does this for compatibility).

### Controls
- `W`, `A`, `S`, `D` or arrow keys to scamper around.
- `Space` to snack on an overlapping collectible.

## Collectibles & Scoring
- Level JSON defines each collectible with position, colors, and `tags`.
- Tags include `good` or `bad` so you can wire different effects later.
- Press `Space` when standing over a treat to collect it; good treats add to your score, bad snacks deduct points.
- Collectible state is shared across all connected players through Socket.IO events.

## Editing the World
- Update `public/levels/level1.json` to change bounds, spawn location, or add decorations.
- Each decoration entry is intentionally simple (position, size, color) so kids can experiment quickly.

## Extending the Game
- Add new Socket.IO events in `server.js` and `public/game.js` for more interactions (collectibles, emotes, etc.).
- Create additional JSON levels and serve them through `/levels/<name>` without extra code changes.

Enjoy exploring Oakley's World!
