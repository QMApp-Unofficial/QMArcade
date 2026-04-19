import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { env } from "./env";

function ensureDir(p: string) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(env.DB_PATH);

export const db = new Database(env.DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  discord_id TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  avatar     TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wordle_daily (
  date      TEXT PRIMARY KEY,
  word      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wordle_plays (
  discord_id TEXT NOT NULL,
  date       TEXT NOT NULL,
  guesses    TEXT NOT NULL DEFAULT '[]',
  status     TEXT NOT NULL DEFAULT 'in_progress',
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (discord_id, date),
  FOREIGN KEY (discord_id) REFERENCES users(discord_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wordle_stats (
  discord_id   TEXT PRIMARY KEY,
  streak       INTEGER NOT NULL DEFAULT 0,
  best_streak  INTEGER NOT NULL DEFAULT 0,
  wins         INTEGER NOT NULL DEFAULT 0,
  losses       INTEGER NOT NULL DEFAULT 0,
  distribution TEXT    NOT NULL DEFAULT '{}',
  last_played  TEXT,
  FOREIGN KEY (discord_id) REFERENCES users(discord_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gacha_inventory (
  discord_id   TEXT NOT NULL,
  character_id TEXT NOT NULL,
  count        INTEGER NOT NULL DEFAULT 1,
  favorite     INTEGER NOT NULL DEFAULT 0,
  first_rolled TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (discord_id, character_id),
  FOREIGN KEY (discord_id) REFERENCES users(discord_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gacha_rolls (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id  TEXT NOT NULL,
  character_id TEXT NOT NULL,
  rarity      TEXT NOT NULL,
  rolled_at   TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (discord_id) REFERENCES users(discord_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gacha_wallet (
  discord_id TEXT PRIMARY KEY,
  currency   INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (discord_id) REFERENCES users(discord_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scribble_stats (
  discord_id  TEXT PRIMARY KEY,
  wins        INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  games       INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (discord_id) REFERENCES users(discord_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS whiteboard_data (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  strokes    TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO whiteboard_data (id, strokes) VALUES (1, '[]');
`;

db.exec(SCHEMA);

export function upsertUser(u: {
  discord_id: string;
  username: string;
  avatar?: string | null;
}) {
  db.prepare(
    `INSERT INTO users (discord_id, username, avatar)
     VALUES (@discord_id, @username, @avatar)
     ON CONFLICT(discord_id) DO UPDATE SET
       username = excluded.username,
       avatar   = excluded.avatar`,
  ).run({ ...u, avatar: u.avatar ?? null });
  // Ensure satellite rows exist
  db.prepare(
    `INSERT OR IGNORE INTO wordle_stats (discord_id) VALUES (?)`,
  ).run(u.discord_id);
  db.prepare(
    `INSERT OR IGNORE INTO scribble_stats (discord_id) VALUES (?)`,
  ).run(u.discord_id);
  db.prepare(
    `INSERT OR IGNORE INTO gacha_wallet (discord_id) VALUES (?)`,
  ).run(u.discord_id);
}
