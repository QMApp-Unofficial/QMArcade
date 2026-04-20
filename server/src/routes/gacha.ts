import { Router } from "express";
import { db } from "../db";
import { requireUser } from "../middleware/auth";
import {
  CHARACTERS,
  CHARACTERS_BY_ID,
  CHARACTER_IMAGE_URLS,
} from "../data/characters";
import { GACHA } from "@qmul/shared";
import type {
  GachaCharacter,
  GachaInventoryEntry,
  GachaRollResult,
  GachaStatus,
  Rarity,
} from "@qmul/shared";

const router = Router();

const WINDOW_MS = GACHA.WINDOW_HOURS * 60 * 60 * 1000;
const IMAGE_CACHE_MAX = 300;

const imageCache = new Map<
  string,
  {
    body: Buffer;
    contentType: string;
  }
>();

/**
 * `gacha_rolls.rolled_at` is populated by SQLite's `datetime('now')`, which
 * returns strings like `'2026-04-20 16:59:34'` (space separator, no fractional
 * seconds, no `Z`). Doing a string comparison against `Date#toISOString()`
 * (which uses `T` and trailing `Z`) silently never matches — SQLite would see
 * every row as older than `since`, reporting 0 rolls used and letting users
 * roll without any window limit. Format the JS side to match SQLite so the
 * comparison is meaningful.
 */
function toSqliteDatetime(d: Date): string {
  return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
}

function fromSqliteDatetime(s: string): Date {
  // SQLite `datetime('now')` values are in UTC but lack the `Z` suffix; without
  // it, `new Date(...)` interprets them as local time, so we re-append it.
  return new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`);
}

function computeRollsRemaining(uid: string): {
  remaining: number;
  nextRefreshAt: string;
} {
  const since = toSqliteDatetime(new Date(Date.now() - WINDOW_MS));
  const row = db
    .prepare(
      `SELECT COUNT(*) AS used, MIN(rolled_at) AS earliest
       FROM gacha_rolls
       WHERE discord_id = ? AND rolled_at > ?`,
    )
    .get(uid, since) as { used: number; earliest: string | null };
  const used = row.used ?? 0;
  const remaining = Math.max(0, GACHA.ROLLS_PER_WINDOW - used);
  const nextRefreshAt = row.earliest
    ? new Date(fromSqliteDatetime(row.earliest).getTime() + WINDOW_MS).toISOString()
    : new Date(Date.now() + WINDOW_MS).toISOString();
  return { remaining, nextRefreshAt };
}

function pickRarity(): Rarity {
  const total =
    GACHA.RARITY_WEIGHTS.common +
    GACHA.RARITY_WEIGHTS.rare +
    GACHA.RARITY_WEIGHTS.epic +
    GACHA.RARITY_WEIGHTS.legendary;
  let n = Math.random() * total;
  for (const r of ["legendary", "epic", "rare", "common"] as const) {
    n -= GACHA.RARITY_WEIGHTS[r];
    if (n <= 0) return r;
  }
  return "common";
}

function pickCharacter(rarity: Rarity): GachaCharacter {
  const pool = CHARACTERS.filter((c) => c.rarity === rarity);
  if (pool.length === 0) {
    const any = CHARACTERS.filter((c) => c.rarity === "common");
    return any[Math.floor(Math.random() * any.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function getCurrency(uid: string): number {
  const row = db
    .prepare("SELECT currency FROM gacha_wallet WHERE discord_id = ?")
    .get(uid) as { currency: number } | undefined;
  return row?.currency ?? 0;
}

router.get("/image/:id", async (req, res) => {
  const id = String(req.params.id || "");
  const remote = CHARACTER_IMAGE_URLS[id];
  if (!remote) return res.status(404).json({ error: "unknown_character" });

  const cached = imageCache.get(id);
  if (cached) {
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Type", cached.contentType);
    return res.send(cached.body);
  }

  try {
    const remoteRes = await fetch(remote, {
      headers: { "User-Agent": "QMArcade-gacha-image-proxy" },
    });
    const contentType = remoteRes.headers.get("content-type") || "";
    if (!remoteRes.ok || !contentType.startsWith("image/")) {
      return res.status(502).json({ error: "image_fetch_failed" });
    }

    const body = Buffer.from(await remoteRes.arrayBuffer());
    imageCache.set(id, { body, contentType });
    if (imageCache.size > IMAGE_CACHE_MAX) {
      const oldest = imageCache.keys().next().value;
      if (oldest) imageCache.delete(oldest);
    }

    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Type", contentType);
    return res.send(body);
  } catch {
    return res.status(502).json({ error: "image_fetch_failed" });
  }
});

router.get("/status", requireUser, (req, res) => {
  const uid = req.user!.discord_id;
  const { remaining, nextRefreshAt } = computeRollsRemaining(uid);
  const status: GachaStatus = {
    rollsRemaining: remaining,
    rollsMax: GACHA.ROLLS_PER_WINDOW,
    nextRefreshAt,
    currency: getCurrency(uid),
  };
  res.json(status);
});

router.post("/roll", requireUser, (req, res) => {
  const uid = req.user!.discord_id;
  const { remaining, nextRefreshAt } = computeRollsRemaining(uid);
  if (remaining <= 0) {
    return res.status(429).json({ error: "cooldown", nextRefreshAt });
  }

  const rarity = pickRarity();
  const character = pickCharacter(rarity);

  const existing = db
    .prepare(
      "SELECT count FROM gacha_inventory WHERE discord_id = ? AND character_id = ?",
    )
    .get(uid, character.id) as { count: number } | undefined;
  const isNew = !existing;
  const newCount = (existing?.count ?? 0) + 1;

  const currencyAwarded = isNew ? 0 : GACHA.DUPLICATE_CURRENCY[character.rarity];

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO gacha_inventory (discord_id, character_id, count)
       VALUES (?, ?, 1)
       ON CONFLICT(discord_id, character_id) DO UPDATE SET count = count + 1`,
    ).run(uid, character.id);
    db.prepare(
      `INSERT INTO gacha_rolls (discord_id, character_id, rarity) VALUES (?, ?, ?)`,
    ).run(uid, character.id, character.rarity);
    if (currencyAwarded > 0) {
      db.prepare(
        `INSERT INTO gacha_wallet (discord_id, currency)
         VALUES (?, ?)
         ON CONFLICT(discord_id) DO UPDATE SET currency = currency + excluded.currency`,
      ).run(uid, currencyAwarded);
    }
  });
  tx();

  const fresh = computeRollsRemaining(uid);
  const result: GachaRollResult = {
    character,
    isNew,
    count: newCount,
    rollsRemaining: fresh.remaining,
    nextRefreshAt: fresh.nextRefreshAt,
    currency: getCurrency(uid),
    currencyAwarded,
  };
  res.json(result);
});

router.get("/inventory", requireUser, (req, res) => {
  const uid = req.user!.discord_id;
  const rows = db
    .prepare(
      `SELECT character_id, count, favorite, first_rolled
       FROM gacha_inventory WHERE discord_id = ? ORDER BY first_rolled DESC`,
    )
    .all(uid) as {
    character_id: string;
    count: number;
    favorite: number;
    first_rolled: string;
  }[];

  const inventory: GachaInventoryEntry[] = rows
    .map((r) => {
      const character = CHARACTERS_BY_ID[r.character_id];
      if (!character) return null;
      return {
        character,
        count: r.count,
        favorite: !!r.favorite,
        first_rolled: r.first_rolled,
      };
    })
    .filter((x): x is GachaInventoryEntry => !!x);

  res.json({ inventory, total: CHARACTERS.length });
});

router.post("/favorite", requireUser, (req, res) => {
  const uid = req.user!.discord_id;
  const { character_id, favorite } = req.body as {
    character_id?: string;
    favorite?: boolean;
  };
  if (!character_id) return res.status(400).json({ error: "missing_character" });
  const owned = db
    .prepare(
      "SELECT 1 FROM gacha_inventory WHERE discord_id = ? AND character_id = ?",
    )
    .get(uid, character_id);
  if (!owned) return res.status(404).json({ error: "not_owned" });
  db.prepare(
    "UPDATE gacha_inventory SET favorite = ? WHERE discord_id = ? AND character_id = ?",
  ).run(favorite ? 1 : 0, uid, character_id);
  res.json({ ok: true });
});

router.get("/roster", (_req, res) => {
  res.json({ characters: CHARACTERS });
});

export default router;
