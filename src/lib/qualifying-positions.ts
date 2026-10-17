import {
  getSeasonSchedule,
  getDriverStandings,
  getQualifyingResults,
  type QualifyingResult,
} from "./ergast";
import { teamColor } from "./team-colors";
import { teamDisplayName } from "./team-names";
import { overrideConstructorId } from "./driver-team-overrides";

export interface QualifyingPositionRow {
  driverId: string;
  qualifyingRank: number;
  code: string;
  name: string;
  constructorId: string;
  constructorName: string;
  color: string;
  countsByPosition: Record<number, number>;
  noTimes: number;
}

export interface QualifyingPositionSummary {
  season: number;
  maxPosition: number;
  drivers: QualifyingPositionRow[];
}

export async function buildQualifyingPositionSummary(season: number): Promise<QualifyingPositionSummary> {
  const [schedule, standings] = await Promise.all([
    getSeasonSchedule(season),
    getDriverStandings(season),
  ]);

  const now = Date.now();
  const completed = schedule.filter((race) => new Date(race.date).getTime() <= now);
  const races = completed.length > 0 ? completed : schedule;

  // Qualifying data is a newer addition than results/standings - a season
  // whose snapshot predates it falls through to a live fetch per round (see
  // ergast.ts), which can fail where the live API isn't reachable at all.
  // That's a "no qualifying data available" case for this section, not a
  // reason to break the whole Positions page, so each round fetch is
  // isolated rather than letting one failure reject the whole batch.
  const BATCH_SIZE = 4;
  const allResults: QualifyingResult[][] = [];
  for (let i = 0; i < races.length; i += BATCH_SIZE) {
    const batch = races.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((race) =>
        getQualifyingResults(season, Number(race.round)).catch(() => [] as QualifyingResult[])
      )
    );
    allResults.push(...batchResults);
  }

  let maxPosition = 1;

  const drivers: (Omit<QualifyingPositionRow, "qualifyingRank"> & { avgPosition: number })[] =
    standings.map((standing) => {
    const constructor = standing.Constructors[standing.Constructors.length - 1];
    const constructorId = overrideConstructorId(
      season,
      standing.Driver.driverId,
      constructor?.constructorId ?? "unknown"
    );
    const constructorName = constructor ? teamDisplayName(constructorId, constructor.name) : "Unknown";
    const color = teamColor(constructorId);

    const countsByPosition: Record<number, number> = {};
    let noTimes = 0;

    for (const results of allResults) {
      const result = results.find((r) => r.Driver.driverId === standing.Driver.driverId);
      if (!result) continue;

      const positionText = result.positionText ?? result.position;
      if (positionText === result.position) {
        const pos = Number(result.position);
        countsByPosition[pos] = (countsByPosition[pos] ?? 0) + 1;
        maxPosition = Math.max(maxPosition, pos);
      } else {
        noTimes++;
      }
    }

    const qualified = Object.values(countsByPosition).reduce((a, b) => a + b, 0);
    const avgPosition = qualified > 0
      ? Object.entries(countsByPosition).reduce((sum, [pos, count]) => sum + Number(pos) * count, 0) / qualified
      : Infinity;

    return {
      driverId: standing.Driver.driverId,
      avgPosition,
      code: standing.Driver.code ?? standing.Driver.familyName.slice(0, 3).toUpperCase(),
      name: `${standing.Driver.givenName} ${standing.Driver.familyName}`,
      constructorId,
      constructorName,
      color,
      countsByPosition,
      noTimes,
    };
  });

  // Ranked by average qualifying position (best first) rather than the
  // championship standings order - this is meant to show who qualifies
  // well independent of how the race itself went.
  drivers.sort((a, b) => a.avgPosition - b.avgPosition);
  const ranked: QualifyingPositionRow[] = drivers.map(({ avgPosition: _avgPosition, ...driver }, index) => ({
    ...driver,
    qualifyingRank: index + 1,
  }));

  // Same floor-on-observed-max logic as finish-positions.ts: a mid-season
  // driver swap means driver-standings length overcounts the real grid
  // size, so use the largest qualifying field actually seen instead.
  const fieldSize = Math.max(0, ...allResults.map((results) => results.length));
  maxPosition = Math.max(maxPosition, fieldSize);

  return { season, maxPosition, drivers: ranked };
}
