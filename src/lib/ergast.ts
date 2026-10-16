// Client for the Jolpica F1 API (https://api.jolpi.ca/ergast/f1), a community-run
// successor to the retired Ergast API that keeps the same response schema.
const BASE_URL = "https://api.jolpi.ca/ergast/f1";

async function ergastFetch<T>(path: string, revalidateSeconds = 3600): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    next: { revalidate: revalidateSeconds },
  });
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

export async function getSeasonSchedule(season: number): Promise<Race[]> {
  type Resp = MRDataEnvelope<{ RaceTable: { Races: Race[] } }>;
  const data = await ergastFetch<Resp>(`/${season}.json?limit=100`);
  return data.MRData.RaceTable.Races;
}

export async function getDriverStandings(season: number): Promise<DriverStanding[]> {
  type Resp = MRDataEnvelope<{
    StandingsTable: { StandingsLists: { DriverStandings: DriverStanding[] }[] };
  }>;
  const data = await ergastFetch<Resp>(`/${season}/driverStandings.json?limit=100`);
  return data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
}

export async function getConstructorStandings(season: number): Promise<ConstructorStanding[]> {
  type Resp = MRDataEnvelope<{
    StandingsTable: { StandingsLists: { ConstructorStandings: ConstructorStanding[] }[] };
  }>;
  const data = await ergastFetch<Resp>(`/${season}/constructorStandings.json?limit=100`);
  return data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];
}

export async function getRaceResults(season: number, round: number): Promise<RaceResult[]> {
  type Resp = MRDataEnvelope<{ RaceTable: { Races: { Results?: RaceResult[] }[] } }>;
  const data = await ergastFetch<Resp>(`/${season}/${round}/results.json?limit=100`);
  return data.MRData.RaceTable.Races[0]?.Results ?? [];
}

export async function getSprintResults(season: number, round: number): Promise<RaceResult[]> {
  type Resp = MRDataEnvelope<{ RaceTable: { Races: { SprintResults?: RaceResult[] }[] } }>;
  const data = await ergastFetch<Resp>(`/${season}/${round}/sprint.json?limit=100`);
  return data.MRData.RaceTable.Races[0]?.SprintResults ?? [];
}
