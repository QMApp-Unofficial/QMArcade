import { Router } from "express";
import { db } from "../db";
import type { WhiteboardStroke } from "@qmul/shared";

const router = Router();

export function readWhiteboard(): WhiteboardStroke[] {
  const row = db
    .prepare("SELECT strokes FROM whiteboard_data WHERE id = 1")
    .get() as { strokes: string } | undefined;
  if (!row) return [];
  try {
    return JSON.parse(row.strokes) as WhiteboardStroke[];
  } catch {
    return [];
  }
}

export function writeWhiteboard(strokes: WhiteboardStroke[]) {
  db.prepare(
    `UPDATE whiteboard_data SET strokes = ?, updated_at = datetime('now') WHERE id = 1`,
  ).run(JSON.stringify(strokes));
}

router.get("/", (_req, res) => {
  res.json({ strokes: readWhiteboard() });
});

export default router;
