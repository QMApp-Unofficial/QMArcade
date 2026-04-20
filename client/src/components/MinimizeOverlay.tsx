import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const MINIMIZED_ACTIVITY_IMAGE = "/activity-minimized.png";

function isCompactPreviewViewport() {
  if (typeof window === "undefined") return false;
  const viewport = window.visualViewport;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  return height <= 420 && width <= 760;
}

/**
 * Activity preview overlay.
 *
 * User request: use the supplied home-screen screenshot as the displayed image
 * when the activity is minimised.
 *
 * We listen for `visibilitychange` and mount the screenshot overlay while the
 * tab is hidden. Discord's pop-up/minimised activity can also keep the page
 * visible while shrinking the viewport, so compact viewports show the same
 * static image instead of a tiny squashed copy of the live app.
 */
export function MinimizeOverlay() {
  const [hidden, setHidden] = useState(
    typeof document !== "undefined" ? document.visibilityState === "hidden" : false,
  );
  const [compactPreview, setCompactPreview] = useState(isCompactPreviewViewport);

  useEffect(() => {
    const image = new Image();
    image.src = MINIMIZED_ACTIVITY_IMAGE;

    function onVis() {
      setHidden(document.visibilityState === "hidden");
    }
    function onResize() {
      setCompactPreview(isCompactPreviewViewport());
    }

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    onResize();

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, []);

  const showingPreview = hidden || compactPreview;

  return (
    <AnimatePresence>
      {showingPreview && (
        <motion.div
          key="minimize-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className="fixed inset-0 z-[60] pointer-events-none overflow-hidden bg-background"
          aria-hidden="true"
        >
          <img
            src={MINIMIZED_ACTIVITY_IMAGE}
            alt=""
            className="h-full w-full object-cover object-center"
            draggable={false}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
