# QMUL Arcade

A tiny **Discord Activity** (embedded app) for a private QMUL gaming server.
It bundles four games/tools behind one polished arcade hub:

| Game          | Kind            | Persistence                |
|---------------|-----------------|-----------------------------|
| Daily Wordle  | Single-player   | Streaks, stats, distribution |
| Character Gacha | Single-player | Inventory, currency, cooldowns |
| Scribble      | Multiplayer     | Session + per-user score    |
| Whiteboard    | Multiplayer     | Shared, auto-saved strokes  |

All of it runs on a single Railway web service backed by a **SQLite database on a volume** at `/data/app.db`. It's tuned for ~5 users, so things are kept deliberately simple.

---

## Architecture

```
qmul-arcade/
├── client/             # React + Vite + TypeScript + Tailwind + shadcn-style UI
├── server/             # Express + better-sqlite3 + Socket.io
├── shared/             # Shared types + constants (imported by client & server)
├── scripts/            # Helper scripts
├── railway.json        # Railway build/deploy configuration
├── .env.example        # Copy to .env for local dev
└── package.json        # Monorepo-level scripts
```

**How a request flows**

1. The Discord Activity iframe loads the built React app served by Express.
2. The client calls `/api/auth/discord` with a code from the Discord Embedded SDK.
3. The server exchanges the code with Discord, saves the user, and sets cookies.
4. Game routes (`/api/wordle`, `/api/gacha`, …) read/write SQLite via `better-sqlite3`.
5. Real-time games (`scribble`, `whiteboard`) use Socket.io namespaces with the same cookies.

---

## Project scripts

```bash
# install everything
npm install

# dev: run server + client concurrently (server on :3001, client on :5173)
npm run dev

# typecheck + build everything
npm run build

# run the production build
npm start
```

---

## Local development

1. `cp .env.example .env` and fill in Discord app IDs if you want real OAuth. The dev login cookie works without them.
2. `npm install` from the repo root.
3. `npm run dev` — Vite proxies `/api` and `/socket.io` to the Node server, so you only need to open [http://localhost:5173](http://localhost:5173).
4. For dev login use any `discord_id` string. Adding it to `ADMIN_DISCORD_IDS` in `.env` makes that user an admin (needed for backup/restore).

---

## SQLite schema

All tables are created idempotently on first boot in `server/src/db.ts`.

```sql
users              (discord_id PK, username, avatar, created_at)
wordle_daily       (date PK, word)
wordle_plays       ((discord_id, date) PK, guesses JSON, status, updated_at)
wordle_stats       (discord_id PK, streak, best_streak, wins, losses, distribution JSON, last_played)
gacha_inventory    ((discord_id, character_id) PK, count, favorite, first_rolled)
gacha_rolls        (id PK, discord_id, character_id, rarity, rolled_at)
gacha_wallet       (discord_id PK, currency)
scribble_stats     (discord_id PK, wins, total_score, games)
whiteboard_data    (id=1 PK, strokes JSON, updated_at)
```

---

## Deploying to Railway

1. **Create a project** on [railway.app](https://railway.app) and point it at your GitHub repo.
2. **Create a Volume** and mount it at `/data`. This is where `app.db` lives.
3. **Set variables** in the project's **Variables** tab:

   | Key                    | Value                                |
   |------------------------|--------------------------------------|
   | `NODE_ENV`             | `production`                         |
   | `PORT`                 | `3001` (Railway overrides this)      |
   | `DB_PATH`              | `/data/app.db`                       |
   | `ADMIN_DISCORD_IDS`    | comma-separated Discord IDs          |
   | `DISCORD_CLIENT_ID`    | from discord developer portal        |
   | `DISCORD_CLIENT_SECRET`| from discord developer portal        |
   | `PUBLIC_URL`           | `https://your-app.up.railway.app`    |
   | `VITE_DISCORD_CLIENT_ID` | same as `DISCORD_CLIENT_ID`        |

4. **Build command**: `npm install && npm run build` (already in `railway.json`).
5. **Start command**: `npm start`.
6. **Health check**: `/api/health`.

### Wiring up the Discord Activity

1. In the [Discord Developer Portal](https://discord.com/developers/applications) → your app:
   - Enable **Activities**.
   - Set the **URL Mapping** target to your Railway domain.
   - Add the **Activity URL** to the *Root Mapping*.
2. In your private Discord server, start the activity from a voice channel.
3. On first launch the client calls `/api/auth/discord` with the OAuth code — that creates the user row and sets cookies.

---

## Backup & Restore

- **Export** — Admin-only GET `/api/backup/export` streams a zip containing `app.db` and `manifest.json`. The server uses `VACUUM INTO` for a consistent snapshot so writers aren't blocked for long.
- **Import** — Admin-only POST `/api/backup/import` (multipart `file`). The server:
  - Rejects non-zips and oversize uploads (≤100 MB).
  - Extracts only whitelisted filenames (`app.db`, `manifest.json`) into a fresh temp dir.
  - Renames the live DB to `app.db.pre-restore-<ts>` as a safety copy.
  - Swaps in the new DB and restarts the process.
- **Whiteboard clear** — Admin-only POST `/api/backup/clear/whiteboard`.

Both flows require the caller's `discord_id` to be in `ADMIN_DISCORD_IDS`. The UI lives at `/admin`.

---

## Game notes

### Wordle
- Deterministic daily word based on the UTC date, so every user on the server sees the same puzzle.
- 5 letters, 6 guesses. Keyboard + on-screen keys, tile-flip animation, guess distribution, share-as-emoji grid.

### Gacha
- 10 rolls per 4 hours (sliding window based on the timestamp of your oldest recent roll).
- Rarity weights: 70 / 22 / 7 / 1.
- Duplicate rolls grant currency (5 / 15 / 50 / 200). Currency is stored but not yet spendable — a natural next feature.
- Add or swap the roster in `server/src/data/characters.ts`. Point `image` at your own CDN / licensed art.

### Scribble
- Join a room by ID (default `main`). 2–8 players.
- Turn order cycles through players across 3 rounds; each turn picks a word from 3 options (auto-pick at 15s).
- 75s drawing timer. Guess scoring scales with remaining time; drawer gets a bonus when someone guesses.
- Round ends early when everyone but the drawer has guessed.

### Whiteboard
- One shared canvas. Strokes broadcast via a `/whiteboard` Socket.io namespace and auto-save every 2s.
- Capped at 5000 strokes (FIFO). Admin has a "Clear" button.

---

## Accessibility

- Dark mode by default with WCAG-friendly contrast.
- Every interactive element is keyboard-reachable with visible focus rings.
- Wordle board uses `role="grid"` + per-cell aria labels.
- Canvases announce role via `aria-label`. Color choices never convey meaning alone (Wordle tiles also change label state; scribble announces "spectating" vs "you're drawing").
- Toasts use `aria-live="polite"`.

---

## Security

- No arbitrary file extraction in restore — filename whitelist + size limit + temp dir.
- Admin routes gated by `ADMIN_DISCORD_IDS`.
- SQL uses parameterized statements only (via `better-sqlite3`).
- Websocket traffic trusts client-provided identity, which is fine for a ~5-user private server. Harden for anything public.

---

## Deliverables checklist

- [x] Architecture explanation (this README)
- [x] Repo file tree (see `Architecture`)
- [x] Full starter code (client + server + shared)
- [x] SQLite schema (`server/src/db.ts`)
- [x] Backup / restore (`server/src/routes/backup.ts` + `client/src/pages/Admin.tsx`)
- [x] UI implementation (pages + shadcn-flavored components)
- [x] README
- [x] Railway deployment instructions (above)

Have fun on the arcade. 🎮
