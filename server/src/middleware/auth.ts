import type { NextFunction, Request, Response } from "express";
import { env } from "../env";
import { upsertUser } from "../db";

declare global {
  namespace Express {
    interface Request {
      user?: { discord_id: string; username: string; avatar: string | null };
    }
  }
}

/**
 * In-process cache of which discord_ids we've already materialised into the
 * users table during this server's lifetime. Upserting on every authenticated
 * request would be wasteful; authenticating the same user twice without ever
 * touching the DB would break the foreign-key constraints on wordle_plays,
 * gacha_inventory, etc. The cache keys on the identity tuple so a username or
 * avatar change triggers a re-upsert.
 */
const userCache = new Set<string>();

function ensureUserRow(user: {
  discord_id: string;
  username: string;
  avatar: string | null;
}) {
  const key = `${user.discord_id}|${user.username}|${user.avatar ?? ""}`;
  if (userCache.has(key)) return;
  try {
    upsertUser(user);
    userCache.add(key);
  } catch (err) {
    // If the upsert fails we'd rather know about it than silently run into
    // cascading FK violations downstream.
    console.error("[auth] upsertUser failed", err);
    throw err;
  }
}

export function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const id =
    req.cookies?.qmul_uid ||
    (req.headers["x-user-id"] as string | undefined);
  const username =
    req.cookies?.qmul_uname ||
    (req.headers["x-username"] as string | undefined) ||
    "player";
  const avatar =
    req.cookies?.qmul_avatar ||
    (req.headers["x-user-avatar"] as string | undefined) ||
    null;

  if (!id) return res.status(401).json({ error: "not_authenticated" });
  const user = {
    discord_id: String(id),
    username: String(username),
    avatar: avatar ? String(avatar) : null,
  };
  try {
    ensureUserRow(user);
  } catch {
    return res.status(500).json({ error: "user_provision_failed" });
  }
  req.user = user;
  next();
}

function hasAdminAccess(req: Request): boolean {
  if (req.user && env.ADMIN_DISCORD_IDS.includes(req.user.discord_id)) {
    return true;
  }
  const token = req.headers["x-admin-token"] as string | undefined;
  if (env.ADMIN_CODE && token && token === env.ADMIN_CODE) return true;
  return false;
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) return res.status(401).json({ error: "not_authenticated" });
  if (!hasAdminAccess(req)) {
    return res.status(403).json({ error: "forbidden_admin_only" });
  }
  next();
}

export function isAdmin(discord_id: string) {
  return env.ADMIN_DISCORD_IDS.includes(discord_id);
}

export function isAdminRequest(req: Request): boolean {
  return hasAdminAccess(req);
}
