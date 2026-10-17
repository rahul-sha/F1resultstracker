import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Race, DriverStanding, ConstructorStanding, RaceResult, QualifyingResult } from "./ergast";

export interface SeasonSnapshot {
  season: number;
  schedule: Race[];
  driverStandings: DriverStanding[];
  constructorStandings: ConstructorStanding[];
  results: Record<string, RaceResult[]>;
  sprintResults: Record<string, RaceResult[]>;
  // Absent on a snapshot taken before qualifying data was tracked - see the
  // snapshot?.qualifying check in ergast.ts's getQualifyingResults.
  qualifying?: Record<string, QualifyingResult[]>;
}

const cache = new Map<number, SeasonSnapshot | null>();

// Completed seasons fetched once via `npm run snapshot:season` and committed
// under data/seasons/ — reading one from disk avoids re-hitting Jolpica's
// rate-limited live API for a season whose data will never change.
export function loadSeasonSnapshot(season: number): SeasonSnapshot | null {
  if (cache.has(season)) return cache.get(season) ?? null;

  const filePath = path.join(process.cwd(), "data", "seasons", `${season}.json`);
  if (!existsSync(filePath)) {
    cache.set(season, null);
    return null;
  }

  const snapshot = JSON.parse(readFileSync(filePath, "utf-8")) as SeasonSnapshot;
  cache.set(season, snapshot);
  return snapshot;
}
