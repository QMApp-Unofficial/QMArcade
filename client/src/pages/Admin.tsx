import { useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Download, Upload, ShieldAlert } from "lucide-react";

export function AdminPage() {
  const { user } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function clearWhiteboard() {
    if (!confirm("Clear the whiteboard for everyone?")) return;
    setBusy(true);
    try {
      await api.post("/backup/clear/whiteboard");
      toast.push({ title: "Whiteboard cleared", tone: "success" });
    } catch (e: any) {
      toast.push({ title: "Failed", description: e?.message, tone: "error" });
    } finally {
      setBusy(false);
    }
  }

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
        <CardHeader title="Moderation" />
        <Button variant="destructive" onClick={clearWhiteboard} disabled={busy}>
          Clear whiteboard
        </Button>
      </Card>
    </div>
  );
}
