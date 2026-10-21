import { buildPointsGrid } from "@/lib/points-grid";
import { buildConstructorPointsGrid } from "@/lib/constructor-points-grid";
import { buildFinishPositionSummary } from "@/lib/finish-positions";
import { buildQualifyingPositionSummary } from "@/lib/qualifying-positions";
import { currentSeason, resolvePersistedSeason } from "@/lib/seasons";
import GridWalk, { type GridWalkMiniStat, type GridWalkStat } from "@/components/gridwalk/GridWalk";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const params = await searchParams;
  const season = Number(params.season) || (await resolvePersistedSeason()) || currentSeason();

  const [pointsGrid, constructorGrid, finishSummary, qualifyingSummary] = await Promise.all([
    buildPointsGrid(season),
    buildConstructorPointsGrid(season),
    buildFinishPositionSummary(season),
    buildQualifyingPositionSummary(season),
  ]);

  const topDriver = pointsGrid.rows[0];
  const driverLeader: GridWalkStat | null = topDriver
    ? { label: "Leading driver", value: `${topDriver.name} — ${topDriver.seasonPoints} pts` }
    : null;

  const topConstructor = constructorGrid.rows[0];
  const constructorLeader: GridWalkStat | null = topConstructor
    ? { label: "Leading team", value: `${topConstructor.name} — ${topConstructor.seasonPoints} pts` }
    : null;

  const topPodiumDriver = finishSummary.driverPodiums[0];
  const podiumLeader: GridWalkStat | null = topPodiumDriver
    ? {
        label: "Most podiums",
        value: `${topPodiumDriver.name} — ${
          topPodiumDriver.podiums[1] + topPodiumDriver.podiums[2] + topPodiumDriver.podiums[3]
        }`,
      }
    : null;

  const topDrivers: GridWalkMiniStat[] = pointsGrid.rows
    .slice(0, 4)
    .map((row) => ({ code: row.code, value: `${row.seasonPoints} pts` }));

  const topPodiumDrivers: GridWalkMiniStat[] = finishSummary.driverPodiums.slice(0, 4).map((row) => ({
    code: row.code,
    value: `${row.podiums[1] + row.podiums[2] + row.podiums[3]} podiums`,
  }));

  return (
    <GridWalk
      season={season}
      driverLeader={driverLeader}
      constructorLeader={constructorLeader}
      podiumLeader={podiumLeader}
      topDrivers={topDrivers}
      topPodiumDrivers={topPodiumDrivers}
      pointsGrid={pointsGrid}
      constructorGrid={constructorGrid}
      finishSummary={finishSummary}
      qualifyingSummary={qualifyingSummary}
    />
  );
}
