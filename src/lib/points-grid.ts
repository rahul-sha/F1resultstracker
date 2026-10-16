import {
  getSeasonSchedule,
  getDriverStandings,
  getRaceResults,
  getSprintResults,
} from "./ergast";
import { raceAbbreviation, raceFlag } from "./circuits";
import { teamColor } from "./team-colors";

export interface PointsGridColumn {
  round: number;
  abbreviation: string;
  raceName: string;
  flag: string;
  hasSprint: boolean;
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
  pointsByRound: (number | null)[];
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

  const perRound = await Promise.all(
    races.map(async (race) => {
      const round = Number(race.round);
      const [results, sprintResults] = await Promise.all([
        getRaceResults(season, round),
        race.Sprint ? getSprintResults(season, round) : Promise.resolve([]),
      ]);
      return { race, results, sprintResults };
    })
  );

  const columns: PointsGridColumn[] = perRound.map(({ race }) => ({
    round: Number(race.round),
    abbreviation: raceAbbreviation(race),
    raceName: race.raceName,
    flag: raceFlag(race),
    hasSprint: Boolean(race.Sprint),
  }));

  const rows: PointsGridRow[] = standings.map((standing) => {
    const pointsByRound = perRound.map(({ results, sprintResults }) => {
      const raceResult = results.find((r) => r.Driver.driverId === standing.Driver.driverId);
      const sprintResult = sprintResults.find(
        (r) => r.Driver.driverId === standing.Driver.driverId
      );
      if (!raceResult && !sprintResult) return null;
      const racePts = raceResult ? Number(raceResult.points) : 0;
      const sprintPts = sprintResult ? Number(sprintResult.points) : 0;
      return racePts + sprintPts;
    });

    const constructor = standing.Constructors[standing.Constructors.length - 1];

    return {
      driverId: standing.Driver.driverId,
      code: standing.Driver.code ?? standing.Driver.familyName.slice(0, 3).toUpperCase(),
      name: `${standing.Driver.givenName} ${standing.Driver.familyName}`,
      constructorId: constructor?.constructorId ?? "unknown",
      constructorName: constructor?.name ?? "Unknown",
      color: teamColor(constructor?.constructorId ?? "unknown"),
      seasonPoints: Number(standing.points),
      seasonWins: Number(standing.wins),
      pointsByRound,
    };
  });

  const maxRoundPoints = Math.max(
    1,
    ...rows.flatMap((r) => r.pointsByRound.filter((p): p is number => p !== null))
  );
  const maxSeasonPoints = Math.max(1, ...rows.map((r) => r.seasonPoints));

  return { season, columns, rows, maxRoundPoints, maxSeasonPoints };
}
