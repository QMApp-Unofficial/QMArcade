import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone?: "default" | "success" | "error";
}

interface ToastCtx {
  push: (t: Omit<ToastItem, "id">) => void;
}

const Ctx = createContext<ToastCtx | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((t: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setItems((prev) => [...prev, { id, ...t }]);
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 3500);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        role="region"
        aria-live="polite"
        className="fixed z-50 top-4 right-4 flex flex-col gap-2 w-[min(20rem,calc(100vw-2rem))]"
      >
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className={
                "surface-glass rounded-xl p-3 pl-3.5 flex gap-3 items-start " +
                (t.tone === "error"
                  ? "!border-destructive/60"
                  : t.tone === "success"
                    ? "!border-[hsl(148_58%_42%/0.55)]"
                    : "")
              }
            >
              <span
                aria-hidden="true"
                className={
                  "mt-1 h-2 w-2 rounded-full shrink-0 " +
                  (t.tone === "error"
                    ? "bg-destructive"
                    : t.tone === "success"
                      ? "bg-[hsl(148_58%_42%)]"
                      : "bg-accent")
                }
              />
              <div className="flex-1">
                <div className="text-sm font-semibold tracking-[-0.005em]">{t.title}</div>
                {t.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.description}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
