"use client";

import { useEffect } from "react";

// Registers the no-op service worker (public/sw.js) so Chrome/Android/
// desktop browsers recognise Grid Walk as an installable PWA. It does not
// cache anything, so it has no effect on what data is shown.
export default function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability is a nice-to-have; a failed registration (e.g. in
        // a browser without support) shouldn't surface as an app error.
      });
    }
  }, []);

  return null;
}
