import {
  getSeasonSchedule,
  getDriverStandings,
  getRaceResults,
  getSprintResults,
  type RaceResult,
} from "./ergast";
import { raceAbbreviation, raceFlagIso } from "./circuits";
import { teamColor } from "./team-colors";
import { teamDisplayName } from "./team-names";

export interface PointsGridColumn {
  round: number;
  abbreviation: string;
  raceName: string;
  flagIso: string | null;
  date: string;
  hasSprint: boolean;
}

export interface PointsCell {
  points: number;
  racePoints: number;
  sprintPoints: number | null;
  position: string | null;
  status: string | null;
}

export interface PointsGridRow {
  driverId: string;
  code: string;
  name: string;
  constructorId: string;
  constructorName: string;
  color: string;
  seasonPoints: number;
  seasonWins: number;
  pointsByRound: (PointsCell | null)[];
}

export interface PointsGrid {
  season: number;
  columns: PointsGridColumn[];
  rows: PointsGridRow[];
  maxRoundPoints: number;
  maxSeasonPoints: number;
}

export async function buildPointsGrid(season: number): Promise<PointsGrid> {
  const [schedule, standings] = await Promise.all([
    getSeasonSchedule(season),
    getDriverStandings(season),
  ]);

  const now = Date.now();
  const completed = schedule.filter((race) => new Date(race.date).getTime() <= now);
  const races = completed.length > 0 ? completed : schedule;

  // Fetched in small batches rather than all at once: a full season is
  // ~24 rounds, and firing every round's request in parallel is exactly the
  // burst that trips Jolpica's rate limit on seasons with no local snapshot.
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

  const rows: PointsGridRow[] = standings.map((standing) => {
    const pointsByRound = perRound.map(({ race, results, sprintResults }) => {
      const raceResult = results.find((r) => r.Driver.driverId === standing.Driver.driverId);
      const sprintResult = sprintResults.find(
        (r) => r.Driver.driverId === standing.Driver.driverId
      );
      if (!raceResult && !sprintResult) return null;
      const racePts = raceResult ? Number(raceResult.points) : 0;
      const sprintPts = sprintResult ? Number(sprintResult.points) : 0;
      return {
        points: racePts + sprintPts,
        racePoints: racePts,
        sprintPoints: race.Sprint ? sprintPts : null,
        position: raceResult ? raceResult.positionText : null,
        status: raceResult ? raceResult.status : null,
      };
    });

    const constructor = standing.Constructors[standing.Constructors.length - 1];

    return {
      driverId: standing.Driver.driverId,
      code: standing.Driver.code ?? standing.Driver.familyName.slice(0, 3).toUpperCase(),
      name: `${standing.Driver.givenName} ${standing.Driver.familyName}`,
      constructorId: constructor?.constructorId ?? "unknown",
      constructorName: constructor
        ? teamDisplayName(constructor.constructorId, constructor.name)
        : "Unknown",
      color: teamColor(constructor?.constructorId ?? "unknown"),
      seasonPoints: Number(standing.points),
      seasonWins: Number(standing.wins),
      pointsByRound,
    };
  });

  const maxRoundPoints = Math.max(
    1,
    ...rows.flatMap((r) => r.pointsByRound.filter((p): p is PointsCell => p !== null).map((p) => p.points))
  );
  const maxSeasonPoints = Math.max(1, ...rows.map((r) => r.seasonPoints));

  return { season, columns, rows, maxRoundPoints, maxSeasonPoints };
}
