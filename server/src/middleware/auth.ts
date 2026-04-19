import type { NextFunction, Request, Response } from "express";
import { env } from "../env";

declare global {
  namespace Express {
    interface Request {
      user?: { discord_id: string; username: string; avatar: string | null };
    }
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
  req.user = { discord_id: String(id), username: String(username), avatar };
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
