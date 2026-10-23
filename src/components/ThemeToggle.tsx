"use client";

import { useEffect, useState } from "react";
import { ThemeIcon } from "./nav-icons";
import { THEME_COOKIE, persistCookie, type Theme } from "@/lib/variant-constants";

const STORAGE_KEY = THEME_COOKIE;
const ORDER: Theme[] = ["light", "dark"];
const LABEL: Record<Theme, string> = { light: "Light", dark: "Dark" };

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

// There's no "Auto" option: with nothing stored yet, the toggle starts
// from whatever the device is showing (the CSS follows the system theme
// until the first click), and each click flips between Light and Dark.
function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored && ORDER.includes(stored)) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);
  const [mounted, setMounted] = useState(false);
  // Counts clicks, so each one re-mounts the icon and ring below and
  // replays their animation as feedback (nothing animates on first load).
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    // Only used to avoid a server/client text mismatch on first paint;
    // the theme value itself comes from the lazy initializer above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    // The cookie lets the server pick the right card images on the next
    // load, so the page never paints the wrong theme's image first.
    persistCookie(THEME_COOKIE, next);
    setPulse((p) => p + 1);
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={cycle}
        className="icon-toggle-btn flex items-center justify-center rounded-full"
        style={{ background: "var(--surface-3)", color: "var(--text-primary)" }}
        aria-label={`Toggle color theme (currently ${mounted ? LABEL[theme] : ""})`}
        title={mounted ? LABEL[theme] : undefined}
      >
        <span key={pulse} className={"toggle-icon" + (pulse ? " pop" : "")}>
          <ThemeIcon />
        </span>
        {pulse > 0 && <span key={`ring-${pulse}`} className="toggle-ring" aria-hidden="true" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="flex items-center justify-between gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
      style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}
      aria-label="Toggle color theme"
    >
      <span className="flex items-center gap-1.5">
        <ThemeIcon />
        <span>Theme</span>
      </span>
      <span style={{ color: "var(--text-primary)" }}>{mounted ? LABEL[theme] : ""}</span>
    </button>
  );
}
