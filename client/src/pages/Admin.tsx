import { useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import {
  Download,
  Upload,
  ShieldAlert,
  Eraser,
  Sparkles,
  Skull,
  PenLine,
} from "lucide-react";

/**
 * All destructive moderation actions funnel through a single ConfirmDialog
 * instance. We keep a discriminated-union `pending` state so the dialog knows
 * what to do on confirm — this avoids repeatedly rendering a dialog per
 * button, and means the "are you sure?" copy stays consistent across every
 * clear/reset.
 */
type PendingAction =
  | { kind: "whiteboard" }
  | { kind: "gacha" }
  | { kind: "wordle" }
  | { kind: "all" };

const COPY: Record<
  PendingAction["kind"],
  { title: string; description: string; confirmLabel: string }
> = {
  whiteboard: {
    title: "Clear the whiteboard?",
    description:
      "This wipes every stroke for everyone. The whiteboard can be redrawn — but what's there now is gone.",
    confirmLabel: "Clear whiteboard",
  },
  gacha: {
    title: "Clear everyone's gacha?",
    description:
      "Deletes every user's inventory, roll history, and currency wallet. User accounts stay. Rolls immediately refill.",
    confirmLabel: "Clear gacha",
  },
  wordle: {
    title: "Clear everyone's Wordle progress?",
    description:
      "Deletes today's plays and every user's lifetime stats (streak, wins, losses). Today's word stays the same.",
    confirmLabel: "Clear Wordle",
  },
  all: {
    title: "Reset the whole arcade?",
    description:
      "Wipes the whiteboard, every user's Wordle stats, every user's gacha, and all Scribble stats. User accounts are kept. There is no undo.",
    confirmLabel: "Reset everything",
  },
};

export function AdminPage() {
  const { user } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);

  if (!user) return <Navigate to="/" replace />;
  if (!user.is_admin) {
    return (
      <Card>
        <CardHeader
          title="Admin"
          description="You need admin rights to view this page."
          right={<ShieldAlert className="h-5 w-5 text-destructive" />}
        />
        <p className="text-sm text-muted-foreground">
          Ask the server owner to add your Discord ID to{" "}
          <code>ADMIN_DISCORD_IDS</code>.
        </p>
      </Card>
    );
  }

  async function doExport() {
    setBusy(true);
    try {
      await api.downloadFile(
        "/backup/export",
        `qmul-arcade-backup-${new Date().toISOString().slice(0, 10)}.zip`,
      );
      toast.push({ title: "Backup started downloading", tone: "success" });
    } catch (e: any) {
      toast.push({ title: "Export failed", description: e?.message, tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function doImport(file: File) {
    setBusy(true);
    try {
      const resp = await api.uploadFile<{ ok: boolean; safetyBackup?: string }>(
        "/backup/import",
        file,
      );
      toast.push({
        title: "Restore complete",
        description: "Server will restart. Refresh the page.",
        tone: "success",
      });
      console.log("Restore:", resp);
    } catch (e: any) {
      toast.push({ title: "Import failed", description: e?.message, tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  /**
   * Maps each pending action to its server route so `doConfirm` stays small.
   * Using a lookup instead of an if-chain makes it trivially auditable which
   * admin button hits which endpoint.
   */
  const ENDPOINT: Record<PendingAction["kind"], string> = {
    whiteboard: "/backup/clear/whiteboard",
    gacha: "/backup/clear/gacha",
    wordle: "/backup/clear/wordle",
    all: "/backup/clear/all",
  };

  async function doConfirm() {
    if (!pending) return;
    setBusy(true);
    try {
      await api.post(ENDPOINT[pending.kind]);
      toast.push({
        title:
          pending.kind === "all"
            ? "Arcade reset"
            : pending.kind === "whiteboard"
              ? "Whiteboard cleared"
              : pending.kind === "gacha"
                ? "Gacha cleared"
                : "Wordle cleared",
        tone: "success",
      });
      setPending(null);
    } catch (e: any) {
      toast.push({
        title: "Action failed",
        description: e?.message,
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  const pendingCopy = pending ? COPY[pending.kind] : null;

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader
          title="Backup & Restore"
          description="Downloads and uploads the SQLite database as a zip."
          right={<ShieldAlert className="h-5 w-5 text-amber-400" />}
        />
        <div className="flex flex-wrap gap-3">
          <Button onClick={doExport} disabled={busy}>
            <Download className="h-4 w-4" /> Export backup
          </Button>
          <Button
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <Upload className="h-4 w-4" /> Import backup…
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doImport(f);
              e.target.value = "";
            }}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Imports validate the archive, whitelist filenames, keep a safety copy,
          and restart the server.
        </p>
      </Card>

      <Card>
        <CardHeader
          title="Moderation"
          description="Every destructive action asks for confirmation before it fires."
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="destructive"
            onClick={() => setPending({ kind: "whiteboard" })}
            disabled={busy}
          >
            <Eraser className="h-4 w-4" /> Clear whiteboard
          </Button>
          <Button
            variant="destructive"
            onClick={() => setPending({ kind: "gacha" })}
            disabled={busy}
          >
            <Sparkles className="h-4 w-4" /> Clear everyone's gacha
          </Button>
          <Button
            variant="destructive"
            onClick={() => setPending({ kind: "wordle" })}
            disabled={busy}
          >
            <PenLine className="h-4 w-4" /> Clear everyone's Wordle
          </Button>
          <Button
            variant="destructive"
            onClick={() => setPending({ kind: "all" })}
            disabled={busy}
          >
            <Skull className="h-4 w-4" /> Reset everything
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={pending !== null}
        title={pendingCopy?.title ?? ""}
        description={pendingCopy?.description}
        confirmLabel={pendingCopy?.confirmLabel ?? "Confirm"}
        onConfirm={doConfirm}
        onCancel={() => setPending(null)}
        busy={busy}
      />
    </div>
  );
}
