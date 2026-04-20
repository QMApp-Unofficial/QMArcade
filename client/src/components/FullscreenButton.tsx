import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const FALLBACK_CLASS = "activity-fullscreen-fallback";

interface Props {
  targetRef: RefObject<HTMLElement>;
  label: string;
  className?: string;
}

export function FullscreenButton({ targetRef, label, className }: Props) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    function onChange() {
      const target = targetRef.current;
      setActive(
        document.fullscreenElement === target ||
          Boolean(target?.classList.contains(FALLBACK_CLASS)),
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      targetRef.current?.classList.remove(FALLBACK_CLASS);
      onChange();
    }

    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("keydown", onKeyDown);
    onChange();

    return () => {
      targetRef.current?.classList.remove(FALLBACK_CLASS);
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [targetRef]);

  async function toggleFullscreen() {
    const target = targetRef.current;
    if (!target) return;

    if (document.fullscreenElement === target) {
      try {
        await document.exitFullscreen();
      } catch {
        // Leave the UI usable even if the host blocks native fullscreen exit.
      }
      setActive(false);
      return;
    }

    if (target.classList.contains(FALLBACK_CLASS)) {
      target.classList.remove(FALLBACK_CLASS);
      setActive(false);
      return;
    }

    if (document.fullscreenEnabled && target.requestFullscreen) {
      try {
        await target.requestFullscreen();
        if (document.fullscreenElement === target) {
          setActive(true);
          return;
        }
      } catch {
        // Discord and other embeds can deny native fullscreen; fall back below.
      }
    }

    target.classList.add(FALLBACK_CLASS);
    setActive(true);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn("p-2 shrink-0", className)}
      onClick={toggleFullscreen}
      aria-label={active ? `Exit fullscreen ${label}` : `Fullscreen ${label}`}
      title={active ? "Exit fullscreen" : "Fullscreen"}
    >
      {active ? (
        <Minimize2 className="h-4 w-4" aria-hidden="true" strokeWidth={2.2} />
      ) : (
        <Maximize2 className="h-4 w-4" aria-hidden="true" strokeWidth={2.2} />
      )}
    </Button>
  );
}
