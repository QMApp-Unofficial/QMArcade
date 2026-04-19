import { Router } from "express";
import { z } from "zod";
import { env } from "../env";
import { upsertUser } from "../db";
import { isAdmin, isAdminRequest } from "../middleware/auth";

const router = Router();

router.post("/dev", (req, res) => {
  if (env.NODE_ENV === "production") {
    return res.status(403).json({ error: "disabled_in_production" });
  }
  const parsed = z
    .object({
      discord_id: z.string().min(1),
      username: z.string().min(1),
      avatar: z.string().nullable().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const { discord_id, username, avatar = null } = parsed.data;
  upsertUser({ discord_id, username, avatar: avatar ?? null });
  const opts = { httpOnly: false, sameSite: "lax" as const, maxAge: 30 * 24 * 3600 * 1000 };
  res.cookie("qmul_uid", discord_id, opts);
  res.cookie("qmul_uname", username, opts);
  if (avatar) res.cookie("qmul_avatar", avatar, opts);
  res.json({ ok: true, user: { discord_id, username, avatar, is_admin: isAdmin(discord_id) } });
});

router.post("/discord", async (req, res) => {
  const parsed = z.object({ code: z.string().min(10) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "missing_code" });
  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) {
    return res.status(500).json({ error: "discord_not_configured" });
  }
  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: parsed.data.code,
      }).toString(),
    });
    if (!tokenRes.ok) {
      return res.status(401).json({ error: "token_exchange_failed" });
    }
    const token = (await tokenRes.json()) as { access_token: string };
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!userRes.ok) return res.status(401).json({ error: "user_fetch_failed" });
    const u = (await userRes.json()) as {
      id: string;
      username: string;
      global_name?: string | null;
      avatar: string | null;
    };
    const username = u.global_name || u.username;
    const avatarUrl = u.avatar
      ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png`
      : null;
    upsertUser({ discord_id: u.id, username, avatar: avatarUrl });
    const opts = { httpOnly: false, sameSite: "lax" as const, maxAge: 30 * 24 * 3600 * 1000 };
    res.cookie("qmul_uid", u.id, opts);
    res.cookie("qmul_uname", username, opts);
    if (avatarUrl) res.cookie("qmul_avatar", avatarUrl, opts);
    res.json({
      ok: true,
      user: { discord_id: u.id, username, avatar: avatarUrl, is_admin: isAdmin(u.id) },
    });
  } catch (e) {
    res.status(500).json({ error: "discord_exchange_error" });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("qmul_uid");
  res.clearCookie("qmul_uname");
  res.clearCookie("qmul_avatar");
  res.json({ ok: true });
});

router.get("/me", (req, res) => {
  const id =
    req.cookies?.qmul_uid ||
    (req.headers["x-user-id"] as string | undefined);
  if (!id) return res.json({ user: null });
  const username =
    req.cookies?.qmul_uname ||
    (req.headers["x-username"] as string | undefined) ||
    "player";
  const avatar =
    req.cookies?.qmul_avatar ||
    (req.headers["x-user-avatar"] as string | undefined) ||
    null;
  res.json({
    user: {
      discord_id: String(id),
      username: String(username),
      avatar: avatar ?? null,
      is_admin: isAdminRequest(req) || isAdmin(String(id)),
    },
  });
});

router.post("/claim-admin", (req, res) => {
  const parsed = z.object({ code: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "missing_code" });
  if (!env.ADMIN_CODE) {
    return res.status(503).json({ error: "admin_code_not_configured" });
  }
  if (parsed.data.code !== env.ADMIN_CODE) {
    return res.status(401).json({ error: "invalid_code" });
  }
  res.json({ ok: true, token: env.ADMIN_CODE });
});

export default router;
