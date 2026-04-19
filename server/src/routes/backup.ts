import { Router } from "express";
import archiver from "archiver";
import multer from "multer";
import unzipper from "unzipper";
import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
import { requireUser, requireAdmin } from "../middleware/auth";
import { db } from "../db";

const router = Router();

/**
 * Exports the SQLite DB (and a small manifest) as a zip stream.
 * Admin only.
 */
router.get("/export", requireUser, requireAdmin, (_req, res) => {
  const dbPath = env.DB_PATH;
  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ error: "db_missing" });
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `qmul-arcade-backup-${ts}.zip`;
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => {
    console.error("archive error", err);
    res.status(500).end();
  });
  archive.pipe(res);

  // Use VACUUM INTO for a consistent snapshot without blocking writers long.
  const tmp = path.join(
    path.dirname(dbPath),
    `backup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`,
  );
  try {
    db.exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
    archive.file(tmp, { name: "app.db" });
  } catch (e) {
    console.error("vacuum failed, falling back to direct copy", e);
    archive.file(dbPath, { name: "app.db" });
  }

  const manifest = {
    app: "qmul-arcade",
    version: 1,
    exportedAt: new Date().toISOString(),
    files: ["app.db"],
  };
  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

  archive.finalize().finally(() => {
    // Clean up temp after the stream is done.
    setTimeout(() => {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }, 5_000);
  });
});

const upload = multer({
  dest: path.join(path.dirname(env.DB_PATH), "uploads"),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

const ALLOWED_FILES = new Set(["app.db", "manifest.json"]);

/**
 * Accepts a .zip previously produced by /export and replaces the DB.
 * Admin only. Validates filenames + size before swapping in.
 */
router.post(
  "/import",
  requireUser,
  requireAdmin,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "no_file" });
    if (req.file.mimetype && !/zip/.test(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "not_a_zip" });
    }

    const tmpDir = path.join(
      path.dirname(env.DB_PATH),
      `restore-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      const directory = await unzipper.Open.file(req.file.path);
      for (const entry of directory.files) {
        const base = path.basename(entry.path);
        if (entry.type !== "File") continue;
        if (!ALLOWED_FILES.has(base)) continue; // whitelist
        const dest = path.join(tmpDir, base);
        await new Promise<void>((resolve, reject) => {
          entry
            .stream()
            .pipe(fs.createWriteStream(dest))
            .on("finish", () => resolve())
            .on("error", reject);
        });
      }

      const dbInTmp = path.join(tmpDir, "app.db");
      if (!fs.existsSync(dbInTmp)) {
        throw new Error("app.db missing in backup");
      }

      // Close current connection to swap the file safely.
      db.close();
      // Keep a safety copy of the existing DB before overwrite.
      const safety = `${env.DB_PATH}.pre-restore-${Date.now()}`;
      if (fs.existsSync(env.DB_PATH)) fs.renameSync(env.DB_PATH, safety);
      fs.copyFileSync(dbInTmp, env.DB_PATH);

      res.json({
        ok: true,
        safetyBackup: safety,
        note: "DB replaced. Please restart the server to reopen connections.",
      });
      // Force process exit so Railway restarts with fresh DB handle.
      setTimeout(() => process.exit(0), 250);
    } catch (e: any) {
      console.error("restore failed", e);
      res.status(400).json({ error: "restore_failed", detail: String(e?.message || e) });
    } finally {
      if (req.file) fs.unlink(req.file.path, () => {});
      // Tmp dir cleanup is best-effort and delayed; we've already decided.
      setTimeout(() => {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {}
      }, 5_000);
    }
  },
);

router.post("/clear/whiteboard", requireUser, requireAdmin, (_req, res) => {
  db.prepare("UPDATE whiteboard_data SET strokes = '[]' WHERE id = 1").run();
  res.json({ ok: true });
});

export default router;
