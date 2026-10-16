"use client";

import { useEffect, useState } from "react";

type Accent = "monokai" | "coffee" | "red";

const STORAGE_KEY = "f1-accent";
const ORDER: Accent[] = ["monokai", "coffee", "red"];
const LABEL: Record<Accent, string> = { monokai: "Monokai", coffee: "Coffee", red: "Ember" };

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
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="flex items-center justify-between gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
      style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}
      aria-label="Cycle color palette"
    >
      <span>Palette</span>
      <span style={{ color: "var(--text-primary)" }}>{mounted ? LABEL[accent] : ""}</span>
    </button>
  );
}
