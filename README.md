# Oakley's World

Oakley's World is a lightweight multiplayer browser playground where every player is a dog. It is built with plain HTML5 Canvas, vanilla JavaScript, and a tiny Node.js + Socket.IO server so kids (and kids-at-heart) can tweak it easily.

## Features
- Friendly welcome screen with quick access to **Customize** or **Join**.
- Dog builder lets you pick a name, fur color, collar color, and fun hats. Choices are saved locally in cookies.
- Instant join button creates a random pup when no customization is stored.
- Multiplayer world synced via Socket.IO with simple broadcast updates.
- JSON-driven level data (`public/levels/level1.json`) keeps the world layout editable without touching code.
- Playful audio cues for joining, walking, chewing, and scoring (good snacks cheer, bad snacks whine).
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

### Run with Docker
1. Build the image:
   ```bash
   docker build -t oakleys-world .
   ```
2. Run the container (binds to port 3000 by default, override with `-p <host-port>:3000`):
   ```bash
   docker run --rm -p 8080:3000 oakleys-world
   ```
3. Visit [http://localhost:8080](http://localhost:8080) (or the host IP when deployed remotely). The `3000` on the right side must stay because the app listens on port 3000 inside the container.

### Docker Compose / Portainer
Use the included `docker-compose.yml` to deploy via `docker compose up -d` or Portainer stacks. The compose file maps host port `9999` to the app’s internal port `3000` and builds the image if needed:
```bash
docker compose up -d
```
Once running, open [http://localhost:9999](http://localhost:9999) or substitute your host’s IP.

### Makefile Helpers
The repo ships with a Makefile for common flows:
- `make install` – install dependencies.
- `make run` – start the server in the foreground (honors `PORT`/`HOST` env vars).
- `make docker-run` – build and run the Docker image (`IMAGE`, `PORT`, `HOST` overridable). Example: `PORT=8080 make docker-run` exposes the game on host port 8080 (container still listens on 3000 internally).
- `make clean` – remove `node_modules`, lockfile, and background PID file.
Run `make help` to view the full list.

### Controls
- `W`, `A`, `S`, `D` or arrow keys to scamper around.
- `Space` to snack on an overlapping collectible.

## Collectibles & Scoring
- Level JSON defines each collectible with position, colors, and `tags`.
- Tags include `good` or `bad` so you can wire different effects later.
- Press `Space` when standing over a treat to collect it; good treats add to your score, bad snacks deduct points.
- Collectible state is shared across all connected players through Socket.IO events.
- Snack time now introduces chew tags (e.g. `chew:soft`, `chew:crunchy`, `chew:hard`, `chew:tough`). Each tag configures how long (starting at ~2 seconds) pups must chew before the treat disappears, while a looping munch sound plays.

## Editing the World
- Update `public/levels/level1.json` to change bounds, spawn location, or add decorations.
- Each decoration entry is intentionally simple (position, size, color) so kids can experiment quickly.

## Extending the Game
- Add new Socket.IO events in `server.js` and `public/game.js` for more interactions (collectibles, emotes, etc.).
- Create additional JSON levels and serve them through `/levels/<name>` without extra code changes.

Enjoy exploring Oakley's World!
