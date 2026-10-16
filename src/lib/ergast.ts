// Client for the Jolpica F1 API (https://api.jolpi.ca/ergast/f1), a community-run
// successor to the retired Ergast API that keeps the same response schema.
import { loadSeasonSnapshot } from "./season-snapshot";
import { currentSeason } from "./seasons";

const BASE_URL = "https://api.jolpi.ca/ergast/f1";

const ONE_HOUR = 60 * 60;
const ONE_YEAR = 60 * 60 * 24 * 365;

// A season that has already finished never changes, so its schedule,
// standings and results cache for a year instead of re-fetching hourly —
// that's most of the API traffic this app makes. Only the in-progress
// current season needs a short revalidate window.
function revalidateFor(season: number): number {
  return season < new Date().getFullYear() ? ONE_YEAR : ONE_HOUR;
}

// Jolpica rate-limits hard, and a full season's heatmap fans out into ~50
// concurrent requests — retry a 429 with backoff instead of failing the page.
async function ergastFetch<T>(path: string, revalidateSeconds = ONE_HOUR, attempt = 1): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    next: { revalidate: revalidateSeconds },
  });
  if (res.status === 429 && attempt <= 3) {
    await new Promise((resolve) => setTimeout(resolve, attempt * 800));
    return ergastFetch<T>(path, revalidateSeconds, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`Ergast API request failed for ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface Driver {
  driverId: string;
  code?: string;
  permanentNumber?: string;
  givenName: string;
  familyName: string;
  nationality: string;
}

export interface Constructor {
  constructorId: string;
  name: string;
  nationality: string;
}

export interface Circuit {
  circuitId: string;
  circuitName: string;
  Location: { lat: string; long: string; locality: string; country: string };
}

export interface Race {
  season: string;
  round: string;
  raceName: string;
  Circuit: Circuit;
  date: string;
  time?: string;
  Sprint?: { date: string; time?: string };
}

export interface RaceResult {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: Driver;
  Constructor: Constructor;
  grid: string;
  laps: string;
  status: string;
}

export interface DriverStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: Driver;
  Constructors: Constructor[];
}

export interface ConstructorStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Constructor: Constructor;
}

interface MRDataEnvelope<T> {
  MRData: T;
}

// A season that has already finished never changes, so its snapshot file is
// the whole truth — no need to ever call the live API for it. The current
// (in-progress) season changes every race, so the snapshot there is only a
// fallback: a weekly re-snapshot (see .github/workflows/snapshot-season.yml)
// keeps it close to current, and it's used only if the live call fails —
// e.g. the community-run Jolpica API being down or rate-limiting.
function isCompletedSeason(season: number): boolean {
  return season < currentSeason();
}

export async function getSeasonSchedule(season: number): Promise<Race[]> {
  const snapshot = loadSeasonSnapshot(season);
  if (snapshot && isCompletedSeason(season)) return snapshot.schedule;

  try {
    type Resp = MRDataEnvelope<{ RaceTable: { Races: Race[] } }>;
    const data = await ergastFetch<Resp>(`/${season}.json?limit=100`, revalidateFor(season));
    return data.MRData.RaceTable.Races;
  } catch (err) {
    if (snapshot) return snapshot.schedule;
    throw err;
  }
}

export async function getDriverStandings(season: number): Promise<DriverStanding[]> {
  const snapshot = loadSeasonSnapshot(season);
  if (snapshot && isCompletedSeason(season)) return snapshot.driverStandings;

  try {
    type Resp = MRDataEnvelope<{
      StandingsTable: { StandingsLists: { DriverStandings: DriverStanding[] }[] };
    }>;
    const data = await ergastFetch<Resp>(
      `/${season}/driverStandings.json?limit=100`,
      revalidateFor(season)
    );
    return data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
  } catch (err) {
    if (snapshot) return snapshot.driverStandings;
    throw err;
  }
}

export async function getConstructorStandings(season: number): Promise<ConstructorStanding[]> {
  const snapshot = loadSeasonSnapshot(season);
  if (snapshot && isCompletedSeason(season)) return snapshot.constructorStandings;

  try {
    type Resp = MRDataEnvelope<{
      StandingsTable: { StandingsLists: { ConstructorStandings: ConstructorStanding[] }[] };
    }>;
    const data = await ergastFetch<Resp>(
      `/${season}/constructorStandings.json?limit=100`,
      revalidateFor(season)
    );
    return data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];
  } catch (err) {
    if (snapshot) return snapshot.constructorStandings;
    throw err;
  }
}

export async function getRaceResults(season: number, round: number): Promise<RaceResult[]> {
  const snapshot = loadSeasonSnapshot(season);
  if (snapshot && isCompletedSeason(season)) return snapshot.results[round] ?? [];

  try {
    type Resp = MRDataEnvelope<{ RaceTable: { Races: { Results?: RaceResult[] }[] } }>;
    const data = await ergastFetch<Resp>(
      `/${season}/${round}/results.json?limit=100`,
      revalidateFor(season)
    );
    return data.MRData.RaceTable.Races[0]?.Results ?? [];
  } catch (err) {
    if (snapshot?.results[round]) return snapshot.results[round];
    throw err;
  }
}

export async function getSprintResults(season: number, round: number): Promise<RaceResult[]> {
  const snapshot = loadSeasonSnapshot(season);
  if (snapshot && isCompletedSeason(season)) return snapshot.sprintResults[round] ?? [];

  try {
    type Resp = MRDataEnvelope<{ RaceTable: { Races: { SprintResults?: RaceResult[] }[] } }>;
    const data = await ergastFetch<Resp>(
      `/${season}/${round}/sprint.json?limit=100`,
      revalidateFor(season)
    );
    return data.MRData.RaceTable.Races[0]?.SprintResults ?? [];
  } catch (err) {
    if (snapshot?.sprintResults[round]) return snapshot.sprintResults[round];
    throw err;
  }
}
