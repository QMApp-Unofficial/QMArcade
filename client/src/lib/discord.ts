/**
 * Minimal Discord Embedded App SDK bootstrap.
 * - Inside Discord: authenticate via the SDK and exchange the auth code with our server.
 * - Outside Discord (e.g. `npm run dev`): fall back to a dev-login modal.
 *
 * The SDK is memoized because `ready()` handshakes once with the Discord parent
 * frame; re-instantiating after logout and calling ready() again can hang.
 */
import { DiscordSDK } from "@discord/embedded-app-sdk";
import { api } from "./api";

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;

let _sdk: DiscordSDK | null = null;
let _ready: Promise<void> | null = null;

async function getReadySDK(): Promise<DiscordSDK> {
  if (!CLIENT_ID) throw new Error("Missing VITE_DISCORD_CLIENT_ID");
  if (!_sdk) _sdk = new DiscordSDK(CLIENT_ID);
  if (!_ready) _ready = _sdk.ready();
  await _ready;
  return _sdk;
}

export function isInsideDiscord(): boolean {
  return typeof window !== "undefined" && /frame_id=/.test(window.location.search);
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
