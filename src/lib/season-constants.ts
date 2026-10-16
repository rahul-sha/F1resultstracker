// Shared, client-safe season helpers. Kept separate from seasons.ts, which
// also exports resolvePersistedSeason() via next/headers (server-only) —
// bundling that into the client (the nav bar's season selector imports
// these) breaks the build, since next/headers is only usable from Server
// Components.

// Jolpica's data gets thinner and less consistent (sprint/results schema
// quirks) the further back you go; capping at 2020 keeps the selector to
// seasons the app actually renders cleanly.
const FIRST_SEASON = 2020;

export const SEASON_COOKIE = "f1-season";

export function currentSeason(): number {
  return new Date().getFullYear();
}

export function availableSeasons(): number[] {
  const latest = currentSeason();
  const seasons: number[] = [];
  for (let year = latest; year >= FIRST_SEASON; year--) {
    seasons.push(year);
  }
  return seasons;
}
