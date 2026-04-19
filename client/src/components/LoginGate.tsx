import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { isInsideDiscord, loginDev, loginViaDiscord } from "@/lib/discord";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Card, CardHeader } from "./ui/Card";
import { APP } from "@qmul/shared";
import { useToast } from "./ui/Toast";

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { user, loading, setUser } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [devId, setDevId] = useState("dev-1");
  const [devName, setDevName] = useState("Dev Player");
  const [autoErr, setAutoErr] = useState<string | null>(null);
  const insideDiscord = isInsideDiscord();

  useEffect(() => {
    if (loading || user || busy || autoErr) return;
    if (!insideDiscord) return;
    setBusy(true);
    loginViaDiscord()
      .then((u) => setUser(u))
      .catch((e) => setAutoErr(e?.message || "Discord auth failed"))
      .finally(() => setBusy(false));
  }, [loading, user, busy, autoErr, insideDiscord, setUser]);

  if (loading || (insideDiscord && busy && !user && !autoErr)) {
    return (
      <div className="min-h-screen grid place-items-center p-4">
        <div className="text-muted-foreground animate-pulse">Signing in…</div>
      </div>
    );
  }

  if (user) return <>{children}</>;

  async function onDiscord() {
    setBusy(true);
    setAutoErr(null);
    try {
      const u = await loginViaDiscord();
      setUser(u);
    } catch (e: any) {
      toast.push({
        title: "Discord login failed",
        description: e?.message || "Try again",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onDev() {
    setBusy(true);
    try {
      const u = await loginDev({ discord_id: devId, username: devName });
      setUser(u);
    } catch (e: any) {
      toast.push({
        title: "Dev login failed",
        description: e?.message || "Try again",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader
          title={`Welcome to ${APP.NAME}`}
          description="Sign in to play, collect, and scribble."
        />
        {autoErr && (
          <p className="text-xs text-destructive mb-3">
            Auto sign-in failed: {autoErr}
          </p>
        )}
        <div className="space-y-3">
          <Button onClick={onDiscord} disabled={busy} className="w-full">
            Continue with Discord
          </Button>
          <div className="text-xs text-muted-foreground text-center">
            or (local dev only)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              aria-label="Discord ID"
              value={devId}
              onChange={(e) => setDevId(e.target.value)}
              placeholder="discord_id"
            />
            <Input
              aria-label="Username"
              value={devName}
              onChange={(e) => setDevName(e.target.value)}
              placeholder="username"
            />
          </div>
          <Button variant="secondary" className="w-full" onClick={onDev} disabled={busy}>
            Dev login
          </Button>
        </div>
      </Card>
    </div>
  );
}
