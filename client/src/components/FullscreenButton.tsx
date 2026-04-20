import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface Props {
  targetRef: RefObject<HTMLElement>;
  label: string;
  className?: string;
}

export function FullscreenButton({ targetRef, label, className }: Props) {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(Boolean(document.fullscreenEnabled));

    function onChange() {
      setActive(document.fullscreenElement === targetRef.current);
    }

    document.addEventListener("fullscreenchange", onChange);
    onChange();
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [targetRef]);

  async function toggleFullscreen() {
    const target = targetRef.current;
    if (!target || !document.fullscreenEnabled) return;

    try {
      if (document.fullscreenElement === target) {
        await document.exitFullscreen();
      } else {
        await target.requestFullscreen();
      }
    } catch {
      // Browser/Discord fullscreen permission failures should not break play.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className={cn("p-2 shrink-0", className)}
      onClick={toggleFullscreen}
      disabled={!supported}
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
