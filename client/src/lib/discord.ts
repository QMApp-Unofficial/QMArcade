/**
 * Minimal Discord Embedded App SDK bootstrap.
 * - Inside Discord: authenticate via the SDK and exchange the auth code with our server.
 * - Outside Discord (e.g. `npm run dev`): fall back to a dev-login modal.
 *
 * The SDK is memoized because `ready()` handshakes once with the Discord parent
 * frame; re-instantiating after logout and calling ready() again can hang.
 *
 * We also install `patchUrlMappings([])` as early as possible when the page is
 * loaded inside the Discord iframe. That hook rewrites any fetch/XHR/WebSocket
 * call with a `discordsays.com` host to include the `/.proxy/` prefix Discord
 * requires for Activities — without it, `/api/*` requests just 404 inside the
 * iframe and the UI shows "Something went wrong" / "Roll failed" for every
 * interaction. Calling with an empty mapping list is a no-op outside Discord.
 */
import { DiscordSDK, patchUrlMappings } from "@discord/embedded-app-sdk";
import { api } from "./api";

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;

export function isInsideDiscord(): boolean {
  return typeof window !== "undefined" && /frame_id=/.test(window.location.search);
}

// Install the URL-mapping hook at module-load time when we're running inside
// the Discord iframe. This must happen before any `fetch` calls so auth,
// /wordle, /gacha, /leaderboard, etc. all get the `/.proxy/` prefix.
let _patched = false;
function ensurePatched() {
  if (_patched) return;
  if (typeof window === "undefined") return;
  if (!isInsideDiscord()) return;
  try {
    patchUrlMappings([]);
    _patched = true;
  } catch (e) {
    // Never crash the app over a missing patch — worst case, auth will fail
    // and the LoginGate surfaces a human-readable error instead.
    console.warn("[discord] patchUrlMappings failed", e);
  }
}

ensurePatched();

let _sdk: DiscordSDK | null = null;
let _ready: Promise<void> | null = null;

async function getReadySDK(): Promise<DiscordSDK> {
  if (!CLIENT_ID) throw new Error("Missing VITE_DISCORD_CLIENT_ID");
  ensurePatched();
  if (!_sdk) _sdk = new DiscordSDK(CLIENT_ID);
  if (!_ready) _ready = _sdk.ready();
  await _ready;
  return _sdk;
}

export async function loginViaDiscord() {
  if (!CLIENT_ID) throw new Error("Missing VITE_DISCORD_CLIENT_ID");
  const sdk = await getReadySDK();
  const { code } = await sdk.commands.authorize({
    client_id: CLIENT_ID,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify"],
  });
  const { user } = await api.post<{ user: any }>("/auth/discord", { code });
  return user;
}

export async function loginDev(params: {
  discord_id: string;
  username: string;
  avatar?: string | null;
}) {
  const { user } = await api.post<{ user: any }>("/auth/dev", params);
  return user;
}
