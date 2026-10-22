"use client";

import { useEffect, useState } from "react";
import { ThemeIcon } from "./nav-icons";

type Theme = "system" | "light" | "dark";

const STORAGE_KEY = "f1-theme";
const ORDER: Theme[] = ["system", "light", "dark"];
const LABEL: Record<Theme, string> = { system: "Auto", light: "Light", dark: "Dark" };

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  return stored && ORDER.includes(stored) ? stored : "system";
}

export default function ThemeToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);
  const [mounted, setMounted] = useState(false);

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
        <ThemeIcon />
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
