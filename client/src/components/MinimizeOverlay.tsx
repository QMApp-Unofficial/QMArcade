import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const MINIMIZED_ACTIVITY_IMAGE = "/activity-minimized.png";

/**
 * Tab-visibility overlay.
 *
 * User request: use the supplied home-screen screenshot as the displayed image
 * when the activity is minimised.
 *
 * We listen for `visibilitychange` and mount the screenshot overlay while the
 * tab is hidden. We preload the image while the app is visible so
 * browsers/Discord have it ready before the snapshot is taken.
 */
export function MinimizeOverlay() {
  const [hidden, setHidden] = useState(
    typeof document !== "undefined" ? document.visibilityState === "hidden" : false,
  );

  useEffect(() => {
    const image = new Image();
    image.src = MINIMIZED_ACTIVITY_IMAGE;

    function onVis() {
      setHidden(document.visibilityState === "hidden");
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <AnimatePresence>
      {hidden && (
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
            className="h-full w-full object-cover"
            draggable={false}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
