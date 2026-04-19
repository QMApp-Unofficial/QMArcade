const BASE = import.meta.env.VITE_API_BASE || "/api";
const STORAGE_KEY = "qmul_user";
const ADMIN_TOKEN_KEY = "qmul_admin_token";

export interface StoredUser {
  discord_id: string;
  username: string;
  avatar: string | null;
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(u: StoredUser | null) {
  try {
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null) {
  try {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function authHeaders(): Record<string, string> {
  const u = getStoredUser();
  const headers: Record<string, string> = {};
  if (u) {
    headers["x-user-id"] = u.discord_id;
    headers["x-username"] = u.username;
    if (u.avatar) headers["x-user-avatar"] = u.avatar;
  }
  const token = getAdminToken();
  if (token) headers["x-admin-token"] = token;
  return headers;
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init.headers || {}),
    },
    ...init,
  });
  if (!res.ok) {
    let body: any;
    try { body = await res.json(); } catch { body = await res.text(); }
    throw new ApiError(res.status, body?.error || res.statusText, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

export const api = {
  get: <T>(p: string) => req<T>(p),
  post: <T>(p: string, body?: unknown) =>
    req<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  uploadFile: async <T>(p: string, file: File): Promise<T> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(BASE + p, {
      method: "POST",
      credentials: "include",
      headers: authHeaders(),
      body: fd,
    });
    if (!res.ok) {
      let body: any;
      try { body = await res.json(); } catch { body = await res.text(); }
      throw new ApiError(res.status, body?.error || res.statusText, body);
    }
    return res.json();
  },
  downloadFile: async (p: string, filename: string) => {
    const res = await fetch(BASE + p, {
      credentials: "include",
      headers: authHeaders(),
    });
    if (!res.ok) throw new ApiError(res.status, res.statusText);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
