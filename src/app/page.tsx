import { buildPointsGrid } from "@/lib/points-grid";
import { buildConstructorPointsGrid } from "@/lib/constructor-points-grid";
import { buildFinishPositionSummary } from "@/lib/finish-positions";
import { currentSeason, resolvePersistedSeason } from "@/lib/seasons";
import GridWalk, { type GridWalkStat } from "@/components/gridwalk/GridWalk";

export default async function Home() {
  const season = (await resolvePersistedSeason()) ?? currentSeason();

  const [pointsGrid, constructorGrid, finishSummary] = await Promise.all([
    buildPointsGrid(season),
    buildConstructorPointsGrid(season),
    buildFinishPositionSummary(season),
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

  return (
    <GridWalk
      season={season}
      driverLeader={driverLeader}
      constructorLeader={constructorLeader}
      podiumLeader={podiumLeader}
    />
  );
}
