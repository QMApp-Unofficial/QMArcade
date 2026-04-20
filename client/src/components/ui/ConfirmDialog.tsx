import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./Button";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

/**
 * A branded replacement for window.confirm — blocks interaction, shows a
 * proper amber/red framing for destructive actions, and keeps the rest of the
 * admin UI looking consistent. Triggered by Escape or the X as well as the
 * Cancel button; Enter confirms.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
  busy,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
            if (e.key === "Enter" && !busy) onConfirm();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="card-elev w-full max-w-sm relative"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby={description ? "confirm-dialog-desc" : undefined}
          >
            <button
              type="button"
              className="absolute top-3 right-3 btn-ghost p-1.5"
              onClick={onCancel}
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3">
              <div
                className={
                  tone === "danger"
                    ? "shrink-0 h-10 w-10 rounded-full bg-destructive/15 text-destructive grid place-items-center"
                    : "shrink-0 h-10 w-10 rounded-full bg-amber-400/15 text-amber-400 grid place-items-center"
                }
                aria-hidden="true"
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  id="confirm-dialog-title"
                  className="font-display text-lg font-bold leading-tight"
                >
                  {title}
                </h3>
                {description && (
                  <p
                    id="confirm-dialog-desc"
                    className="mt-1 text-sm text-muted-foreground"
                  >
                    {description}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={onCancel} disabled={busy}>
                {cancelLabel}
              </Button>
              <Button
                variant={tone === "danger" ? "destructive" : "primary"}
                onClick={onConfirm}
                disabled={busy}
                autoFocus
              >
                {busy ? "Working…" : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
