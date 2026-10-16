import {
  getSeasonSchedule,
  getConstructorStandings,
  getRaceResults,
  getSprintResults,
  type RaceResult,
} from "./ergast";
import { raceAbbreviation, raceFlagIso } from "./circuits";
import { teamColor } from "./team-colors";
import { teamDisplayName } from "./team-names";
import type { PointsGridColumn } from "./points-grid";

export interface ConstructorPointsCell {
  points: number;
}

export interface ConstructorPointsGridRow {
  constructorId: string;
  position: string;
  name: string;
  color: string;
  seasonPoints: number;
  seasonWins: number;
  pointsByRound: (ConstructorPointsCell | null)[];
}

export interface ConstructorPointsGrid {
  season: number;
  columns: PointsGridColumn[];
  rows: ConstructorPointsGridRow[];
  maxRoundPoints: number;
  maxSeasonPoints: number;
}

// Mirrors buildPointsGrid (points-grid.ts), but totals both drivers' points
// per team per round instead of one row per driver — same snapshot-backed
// schedule/results fetch, just summed by Constructor.constructorId rather
// than by Driver.driverId.
export async function buildConstructorPointsGrid(season: number): Promise<ConstructorPointsGrid> {
  const [schedule, standings] = await Promise.all([
    getSeasonSchedule(season),
    getConstructorStandings(season),
  ]);

  const now = Date.now();
  const completed = schedule.filter((race) => new Date(race.date).getTime() <= now);
  const races = completed.length > 0 ? completed : schedule;

  const BATCH_SIZE = 4;
  const perRound: { race: typeof races[number]; results: RaceResult[]; sprintResults: RaceResult[] }[] = [];
  for (let i = 0; i < races.length; i += BATCH_SIZE) {
    const batch = races.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (race) => {
        const round = Number(race.round);
        const [results, sprintResults] = await Promise.all([
          getRaceResults(season, round),
          race.Sprint ? getSprintResults(season, round) : Promise.resolve([]),
        ]);
        return { race, results, sprintResults };
      })
    );
    perRound.push(...batchResults);
  }

  const columns: PointsGridColumn[] = perRound.map(({ race }) => ({
    round: Number(race.round),
    abbreviation: raceAbbreviation(race),
    raceName: race.raceName,
    flagIso: raceFlagIso(race),
    date: race.date,
    hasSprint: Boolean(race.Sprint),
  }));

  const rows: ConstructorPointsGridRow[] = standings.map((standing) => {
    const constructorId = standing.Constructor.constructorId;

    const pointsByRound = perRound.map(({ results, sprintResults }) => {
      const raceEntries = results.filter((r) => r.Constructor.constructorId === constructorId);
      const sprintEntries = sprintResults.filter((r) => r.Constructor.constructorId === constructorId);
      if (raceEntries.length === 0 && sprintEntries.length === 0) return null;
      const racePts = raceEntries.reduce((sum, r) => sum + Number(r.points), 0);
      const sprintPts = sprintEntries.reduce((sum, r) => sum + Number(r.points), 0);
      return { points: racePts + sprintPts };
    });

    return {
      constructorId,
      position: standing.position,
      name: teamDisplayName(constructorId, standing.Constructor.name),
      color: teamColor(constructorId),
      seasonPoints: Number(standing.points),
      seasonWins: Number(standing.wins),
      pointsByRound,
    };
  });

  const maxRoundPoints = Math.max(
    1,
    ...rows.flatMap((r) =>
      r.pointsByRound.filter((p): p is ConstructorPointsCell => p !== null).map((p) => p.points)
    )
  );
  const maxSeasonPoints = Math.max(1, ...rows.map((r) => r.seasonPoints));

  return { season, columns, rows, maxRoundPoints, maxSeasonPoints };
}
