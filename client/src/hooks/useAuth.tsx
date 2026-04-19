import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  api,
  getStoredUser,
  setStoredUser,
  getAdminToken,
  setAdminToken,
} from "@/lib/api";

export interface AuthUser {
  discord_id: string;
  username: string;
  avatar: string | null;
  is_admin?: boolean;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  setUser: (u: AuthUser | null) => void;
  logout: () => Promise<void>;
  claimAdmin: (code: string) => Promise<void>;
  releaseAdmin: () => void;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(() => {
    const u = getStoredUser();
    return u ? { ...u, is_admin: !!getAdminToken() } : null;
  });
  const [loading, setLoading] = useState(true);

  function setUser(u: AuthUser | null) {
    setUserState(u);
    setStoredUser(
      u ? { discord_id: u.discord_id, username: u.username, avatar: u.avatar } : null,
    );
  }

  useEffect(() => {
    api
      .get<{ user: AuthUser | null }>("/auth/me")
      .then((r) => {
        if (r.user) {
          setUserState(r.user);
          setStoredUser({
            discord_id: r.user.discord_id,
            username: r.user.username,
            avatar: r.user.avatar,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      setUser,
      logout: async () => {
        try {
          await api.post("/auth/logout");
        } catch {
          /* ignore */
        }
        setAdminToken(null);
        setUser(null);
      },
      claimAdmin: async (code: string) => {
        const res = await api.post<{ ok: boolean; token: string }>(
          "/auth/claim-admin",
          { code },
        );
        if (!res.token) throw new Error("no_token");
        setAdminToken(res.token);
        setUserState((u) => (u ? { ...u, is_admin: true } : u));
      },
      releaseAdmin: () => {
        setAdminToken(null);
        setUserState((u) => (u ? { ...u, is_admin: false } : u));
      },
    }),
    [user, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
