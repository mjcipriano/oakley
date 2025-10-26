# Purpose
We are creating multiplayer game where players are dogs. This will be a 2D open world top down game.

# User Story
When first connecting to the game, you see a page that says:
"Welcome to Oakley's World"

There are 2 buttons
1) Customize
2) Join

If Customize is pressed - it leads you to a page which allows you to customize your dog. You can customize their color, their collar, their name, and what hat they are wearing. This information is saves on their computer in cookies.

If Join is pressed it will join the world with their dog. If they did not customize their dog yet, it will give them a random dog name, color, collar, and hat.

# Architecture
## Overview
Oakley’s World is a **simple multiplayer browser game** using:
- **Vanilla JavaScript + HTML5 Canvas** for the client
- **Node.js + Socket.IO** for multiplayer
- **JSON files** for levels and easy editing

It must remain easy for kids to edit and for developers to extend without frameworks or build steps.

---

## Core Rules
1. **No frameworks or build tools.**
   - Only use `express` and `socket.io`.
   - Plain browser JavaScript — no React, Phaser, etc.

2. **One-folder architecture.**
OakleysWorld/
├─ server.js
└─ public/
├─ index.html
├─ game.js
└─ levels/
└─ level1.json


3. **Editable levels.**
- Levels are JSON files defining `bounds`, `spawn`, and visual elements (`decorations`, `collectibles`, etc.).
- All world design changes should happen in JSON, not code.

4. **Multiplayer.**
- Players join by entering the same world name.
- The server relays movement and basic shared state.
- No authentication or persistence needed.

5. **Extensibility.**
- Keep all gameplay logic simple and readable.
- Add new interactions via extra Socket.IO events (e.g. collectibles, chat, goals).
- Do not introduce new dependencies or complexity.

6. **Run command.**
npm i express socket.io
node server.js
Then open `http://localhost:3000`.

## Agent Goals
When extending Oakley’s World:
- Maintain the same folder layout.
- Keep gameplay code short, commented, and readable.
- Use JSON-driven design for all new content.
- Ensure multiplayer sync stays simple (broadcast only).
- Never add frameworks or bundlers.

# Additional Info

## Current Implementation Notes
- Server: `server.js` uses Express 4 for static hosting and Socket.IO for broadcast-only multiplayer state (kept framework-free).
- Client: `public/index.html` + `public/game.js` provide the welcome screen, customization UI, and canvas renderer with vanilla JavaScript.
- Levels: `public/levels/level1.json` defines world bounds, spawn location, and simple decorations editable by kids.
- Player setup: customization choices (name, fur color, collar color, hat) persist locally via cookies; random pups are generated when no cookie is present.
