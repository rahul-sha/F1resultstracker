import { getSeasonSchedule, getDriverStandings, getRaceResults, type RaceResult } from "./ergast";
import { teamColor } from "./team-colors";
import { teamDisplayName } from "./team-names";
import { overrideConstructorId } from "./driver-team-overrides";

export interface PodiumCounts {
  1: number;
  2: number;
  3: number;
}

export interface FinishPositionRow {
  driverId: string;
  standingsPosition: string;
  code: string;
  name: string;
  constructorId: string;
  constructorName: string;
  color: string;
  countsByPosition: Record<number, number>;
  dnfs: number;
  podiums: PodiumCounts;
}

export interface FinishPositionTeamRow {
  constructorId: string;
  constructorName: string;
  color: string;
  podiums: PodiumCounts;
}

export interface FinishPositionSummary {
  season: number;
  maxPosition: number;
  drivers: FinishPositionRow[];
  driverPodiums: FinishPositionRow[];
  teamPodiums: FinishPositionTeamRow[];
}

export async function buildFinishPositionSummary(season: number): Promise<FinishPositionSummary> {
  const [schedule, standings] = await Promise.all([
    getSeasonSchedule(season),
    getDriverStandings(season),
  ]);

  const now = Date.now();
  const completed = schedule.filter((race) => new Date(race.date).getTime() <= now);
  const races = completed.length > 0 ? completed : schedule;

  const BATCH_SIZE = 4;
  const allResults: RaceResult[][] = [];
  for (let i = 0; i < races.length; i += BATCH_SIZE) {
    const batch = races.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((race) => getRaceResults(season, Number(race.round)))
    );
    allResults.push(...batchResults);
  }

  let maxPosition = 1;
  const teamPodiumMap = new Map<string, FinishPositionTeamRow>();

  const drivers: FinishPositionRow[] = standings.map((standing) => {
    const constructor = standing.Constructors[standing.Constructors.length - 1];
    const constructorId = overrideConstructorId(
      season,
      standing.Driver.driverId,
      constructor?.constructorId ?? "unknown"
    );
    const constructorName = constructor ? teamDisplayName(constructorId, constructor.name) : "Unknown";
    const color = teamColor(constructorId);

    const countsByPosition: Record<number, number> = {};
    let dnfs = 0;
    const podiums: PodiumCounts = { 1: 0, 2: 0, 3: 0 };

    for (const results of allResults) {
      const result = results.find((r) => r.Driver.driverId === standing.Driver.driverId);
      if (!result) continue;

      if (result.positionText === result.position) {
        const pos = Number(result.position);
        countsByPosition[pos] = (countsByPosition[pos] ?? 0) + 1;
        maxPosition = Math.max(maxPosition, pos);
        if (pos <= 3) {
          podiums[pos as 1 | 2 | 3]++;
          const teamRow = teamPodiumMap.get(constructorId) ?? {
            constructorId,
            constructorName,
            color,
            podiums: { 1: 0, 2: 0, 3: 0 },
          };
          teamRow.podiums[pos as 1 | 2 | 3]++;
          teamPodiumMap.set(constructorId, teamRow);
        }
      } else {
        dnfs++;
      }
    }

    return {
      driverId: standing.Driver.driverId,
      standingsPosition: standing.position,
      code: standing.Driver.code ?? standing.Driver.familyName.slice(0, 3).toUpperCase(),
      name: `${standing.Driver.givenName} ${standing.Driver.familyName}`,
      constructorId,
      constructorName,
      color,
      countsByPosition,
      dnfs,
      podiums,
    };
  });

  // The grid should always span one column per car that actually took the
  // start, even if no driver has been classified in the last couple of
  // positions yet (the tail of the field keeps retiring before the flag) —
  // so each round's own entry list (its real grid size) is a floor on top
  // of whatever position was actually observed. Driver-standings length
  // isn't reliable for this: a mid-season driver swap adds a second
  // standings row for the same seat, one more than there were ever cars
  // on track in a single race.
  const fieldSize = Math.max(0, ...allResults.map((results) => results.length));
  maxPosition = Math.max(maxPosition, fieldSize);

  const podiumTotal = (p: PodiumCounts) => p[1] + p[2] + p[3];
  const driverPodiums = drivers
    .filter((d) => podiumTotal(d.podiums) > 0)
    .sort((a, b) => podiumTotal(b.podiums) - podiumTotal(a.podiums));
  const teamPodiums = [...teamPodiumMap.values()].sort(
    (a, b) => podiumTotal(b.podiums) - podiumTotal(a.podiums)
  );

  return { season, maxPosition, drivers, driverPodiums, teamPodiums };
}
