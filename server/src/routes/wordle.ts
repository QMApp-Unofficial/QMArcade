import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { requireUser } from "../middleware/auth";
import { todayKey, isConsecutiveDay } from "../utils/daily";
import { isAcceptableGuess, isRealEnglishWord, pickDailyWord } from "../data/words";
import { WORDLE } from "@qmul/shared";
import type { LetterFeedback, WordleState, WordleStats } from "@qmul/shared";

const router = Router();

function scoreGuess(guess: string, answer: string): LetterFeedback[] {
  const g = guess.toLowerCase();
  const a = answer.toLowerCase();
  const result: LetterFeedback[] = Array(g.length).fill("absent");
  const remaining: Record<string, number> = {};
  for (let i = 0; i < a.length; i++) {
    if (g[i] === a[i]) result[i] = "correct";
    else remaining[a[i]] = (remaining[a[i]] || 0) + 1;
  }
  for (let i = 0; i < a.length; i++) {
    if (result[i] === "correct") continue;
    const ch = g[i];
    if (remaining[ch]) {
      result[i] = "present";
      remaining[ch]--;
    }
  }
  return result;
}

function ensureDailyWord(date: string): string {
  const row = db
    .prepare("SELECT word FROM wordle_daily WHERE date = ?")
    .get(date) as { word: string } | undefined;
  if (row) return row.word;
  const word = pickDailyWord(date);
  db.prepare("INSERT INTO wordle_daily (date, word) VALUES (?, ?)").run(date, word);
  return word;
}

function buildState(
  discord_id: string,
  date: string,
  word: string,
): WordleState {
  const row = db
    .prepare(
      "SELECT guesses, status FROM wordle_plays WHERE discord_id = ? AND date = ?",
    )
    .get(discord_id, date) as
    | { guesses: string; status: WordleState["status"] }
    | undefined;
  const guesses: string[] = row ? JSON.parse(row.guesses) : [];
  const status = row ? row.status : "in_progress";
  const feedback = guesses.map((g) => scoreGuess(g, word));
  return {
    date,
    guesses,
    status,
    wordLength: WORDLE.LENGTH,
    maxAttempts: WORDLE.MAX_ATTEMPTS,
    feedback,
    answer: status === "in_progress" ? undefined : word,
  };
}

router.get("/state", requireUser, (req, res) => {
  const date = todayKey();
  const word = ensureDailyWord(date);
  res.json(buildState(req.user!.discord_id, date, word));
});

router.post("/guess", requireUser, (req, res) => {
  const parsed = z
    .object({ guess: z.string().min(1).max(32) })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "bad_body" });
  const guess = parsed.data.guess.toLowerCase();
  if (!isAcceptableGuess(guess, WORDLE.LENGTH)) {
    return res.status(400).json({ error: "invalid_guess" });
  }
  if (!isRealEnglishWord(guess)) {
    return res.status(400).json({ error: "not_in_dictionary" });
  }
  const date = todayKey();
  const word = ensureDailyWord(date);
  const uid = req.user!.discord_id;
  const state = buildState(uid, date, word);
  if (state.status !== "in_progress") {
    return res.status(400).json({ error: "already_finished", state });
  }
  if (state.guesses.length >= WORDLE.MAX_ATTEMPTS) {
    return res.status(400).json({ error: "out_of_attempts", state });
  }

  const guesses = [...state.guesses, guess];
  const won = guess === word;
  const exhausted = guesses.length >= WORDLE.MAX_ATTEMPTS;
  const status: WordleState["status"] = won
    ? "won"
    : exhausted
      ? "lost"
      : "in_progress";

  db.prepare(
    `INSERT INTO wordle_plays (discord_id, date, guesses, status, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(discord_id, date) DO UPDATE SET
       guesses = excluded.guesses,
       status  = excluded.status,
       updated_at = datetime('now')`,
  ).run(uid, date, JSON.stringify(guesses), status);

  if (status !== "in_progress") applyStatsUpdate(uid, date, status, guesses.length);

  res.json(buildState(uid, date, word));
});

function applyStatsUpdate(
  discord_id: string,
  date: string,
  status: "won" | "lost",
  attempts: number,
) {
  const row = db
    .prepare(
      `SELECT streak, best_streak, wins, losses, distribution, last_played
       FROM wordle_stats WHERE discord_id = ?`,
    )
    .get(discord_id) as
    | {
        streak: number;
        best_streak: number;
        wins: number;
        losses: number;
        distribution: string;
        last_played: string | null;
      }
    | undefined;
  const stats = row || {
    streak: 0,
    best_streak: 0,
    wins: 0,
    losses: 0,
    distribution: "{}",
    last_played: null,
  };
  const distribution: Record<number, number> = JSON.parse(stats.distribution);
  let streak = stats.streak;
  if (status === "won") {
    if (stats.last_played && isConsecutiveDay(stats.last_played, date)) streak += 1;
    else if (stats.last_played === date) {
      /* same-day replay guard: no change */
    } else streak = 1;
    distribution[attempts] = (distribution[attempts] || 0) + 1;
  } else {
    streak = 0;
  }
  const best_streak = Math.max(stats.best_streak, streak);
  const wins = stats.wins + (status === "won" ? 1 : 0);
  const losses = stats.losses + (status === "lost" ? 1 : 0);

  db.prepare(
    `INSERT INTO wordle_stats (discord_id, streak, best_streak, wins, losses, distribution, last_played)
     VALUES (@discord_id, @streak, @best_streak, @wins, @losses, @distribution, @last_played)
     ON CONFLICT(discord_id) DO UPDATE SET
       streak = excluded.streak,
       best_streak = excluded.best_streak,
       wins = excluded.wins,
       losses = excluded.losses,
       distribution = excluded.distribution,
       last_played = excluded.last_played`,
  ).run({
    discord_id,
    streak,
    best_streak,
    wins,
    losses,
    distribution: JSON.stringify(distribution),
    last_played: date,
  });
}

router.get("/stats", requireUser, (req, res) => {
  const uid = req.user!.discord_id;
  const row = db
    .prepare(
      `SELECT streak, best_streak, wins, losses, distribution, last_played
       FROM wordle_stats WHERE discord_id = ?`,
    )
    .get(uid) as
    | {
        streak: number;
        best_streak: number;
        wins: number;
        losses: number;
        distribution: string;
        last_played: string | null;
      }
    | undefined;
  const stats: WordleStats = row
    ? {
        streak: row.streak,
        best_streak: row.best_streak,
        wins: row.wins,
        losses: row.losses,
        distribution: JSON.parse(row.distribution),
        last_played: row.last_played,
      }
    : {
        streak: 0,
        best_streak: 0,
        wins: 0,
        losses: 0,
        distribution: {},
        last_played: null,
      };
  res.json(stats);
});

export default router;
