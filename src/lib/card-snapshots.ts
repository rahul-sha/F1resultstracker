import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { ACCENT_COOKIE, THEME_COOKIE, isAccent, isTheme, type Accent, type Theme } from "./variant-constants";

// Server-only helpers for Grid Walk's pre-rendered card images. Visitors
// never see a card rendered live: every card is an image captured by
// scripts/capture-card-snapshots.mjs, which also writes this manifest with
// each image's natural (CSS-pixel) size so the page can lay the cards out
// before a single image has loaded.

export type SnapshotManifest = {
  season: number;
  capturedAt: string;
  // name -> natural size in CSS pixels (theme/palette-invariant).
  sizes: Record<string, { w: number; h: number }>;
};

export function readSnapshotManifest(season: number): SnapshotManifest | null {
  const filePath = path.join(process.cwd(), "public", "card-snapshots", String(season), "manifest.json");
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as SnapshotManifest;
  } catch {
    return null;
  }
}

// The visitor's theme and palette as last persisted by the toggles. Theme
// is null when nothing has been chosen yet, in which case the page follows
// the device's colour scheme with a <picture> media query instead.
export async function resolvePersistedVariant(): Promise<{ accent: Accent; theme: Theme | null }> {
  const store = await cookies();
  const accent = store.get(ACCENT_COOKIE)?.value;
  const theme = store.get(THEME_COOKIE)?.value;
  return {
    accent: isAccent(accent) ? accent : "monokai",
    theme: isTheme(theme) ? theme : null,
  };
}
