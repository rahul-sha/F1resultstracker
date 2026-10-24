"use client";

import { useEffect, useState } from "react";
import { PaletteIcon } from "./nav-icons";
import { IconPill } from "./ui";
import { ACCENT_COOKIE, persistCookie, type Accent } from "@/lib/variant-constants";

const STORAGE_KEY = ACCENT_COOKIE;
const ORDER: Accent[] = ["monokai", "coffee", "red", "dracula"];
const LABEL: Record<Accent, string> = {
  monokai: "Monokai",
  coffee: "Coffee",
  red: "Ember",
  dracula: "Dracula",
};

function applyAccent(accent: Accent) {
  const root = document.documentElement;
  if (accent === "monokai") {
    // Monokai is the default palette, carried by the bare :root tokens, so
    // no attribute is needed to render it.
    root.removeAttribute("data-accent");
  } else {
    root.setAttribute("data-accent", accent);
  }
}

function readStoredAccent(): Accent {
  if (typeof window === "undefined") return "monokai";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Accent | null;
  return stored && ORDER.includes(stored) ? stored : "monokai";
}

export default function AccentToggle() {
  const [accent, setAccent] = useState<Accent>(readStoredAccent);
  const [mounted, setMounted] = useState(false);
  // Counts clicks, so each one re-mounts the icon and ring below and
  // replays their animation as feedback (nothing animates on first load).
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    // Only used to avoid a server/client text mismatch on first paint; the
    // accent value itself comes from the lazy initializer above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(accent) + 1) % ORDER.length];
    setAccent(next);
    applyAccent(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    // Mirrored into a cookie so the server picks the right card images.
    persistCookie(ACCENT_COOKIE, next);
    setPulse((p) => p + 1);
  }

  return (
    <IconPill
      onClick={cycle}
      className="icon-toggle-btn"
      aria-label={`Cycle color palette (currently ${mounted ? LABEL[accent] : ""})`}
      title={mounted ? LABEL[accent] : undefined}
    >
      <span key={pulse} className={"toggle-icon" + (pulse ? " pop" : "")}>
        <PaletteIcon />
      </span>
      {pulse > 0 && <span key={`ring-${pulse}`} className="toggle-ring" aria-hidden="true" />}
    </IconPill>
  );
}
