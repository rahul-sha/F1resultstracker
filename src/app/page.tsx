import { buildPointsGrid } from "@/lib/points-grid";
import { buildConstructorPointsGrid } from "@/lib/constructor-points-grid";
import { buildFinishPositionSummary } from "@/lib/finish-positions";
import { buildQualifyingPositionSummary } from "@/lib/qualifying-positions";
import { currentSeason, resolvePersistedSeason } from "@/lib/seasons";
import GridWalk from "@/components/gridwalk/GridWalk";

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

  return (
    <GridWalk
      season={season}
      pointsGrid={pointsGrid}
      constructorGrid={constructorGrid}
      finishSummary={finishSummary}
      qualifyingSummary={qualifyingSummary}
    />
  );
}
