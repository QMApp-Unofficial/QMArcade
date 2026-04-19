import { Router } from "express";
import { db } from "../db";
import type { LeaderboardRow } from "@qmul/shared";

const router = Router();

router.get("/", (_req, res) => {
  const rows = db
    .prepare(
      `
      SELECT
        u.discord_id,
        u.username,
        u.avatar,
        COALESCE(ws.best_streak, 0) AS wordle_best_streak,
        COALESCE(ws.wins, 0)         AS wordle_wins,
        (SELECT COUNT(*) FROM gacha_inventory g WHERE g.discord_id = u.discord_id) AS gacha_count,
        COALESCE(ss.total_score, 0)  AS scribble_score
      FROM users u
      LEFT JOIN wordle_stats   ws ON ws.discord_id = u.discord_id
      LEFT JOIN scribble_stats ss ON ss.discord_id = u.discord_id
      ORDER BY wordle_best_streak DESC, wordle_wins DESC, gacha_count DESC
      LIMIT 50
      `,
    )
    .all() as LeaderboardRow[];
  res.json({ rows });
});

export default router;
