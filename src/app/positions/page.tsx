import { Suspense } from "react";
import { buildPointsGrid } from "@/lib/points-grid";
import { currentSeason } from "@/lib/seasons";
import PointsHeatmap from "@/components/PointsHeatmap";
import SeasonSelector from "@/components/SeasonSelector";

export const metadata = { title: "Positions | F1 Results Tracker" };

async function PositionsGridSection({ season }: { season: number }) {
  const grid = await buildPointsGrid(season);

  if (grid.rows.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        No results available yet for the {season} season.
      </p>
    );
  }

  return <PointsHeatmap grid={grid} mode="position" />;
}

export default async function PositionsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const params = await searchParams;
  const season = Number(params.season) || currentSeason();

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Positions</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Where each driver finished in every Grand Prix. Darker is a stronger finish;
            retirements and non-classifications are shown in a neutral grey. Sprint weekends show
            the sprint finish as a small superscript next to the main race result.
          </p>
        </div>
        <SeasonSelector season={season} />
      </div>

      <Suspense
        fallback={
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Loading {season} positions…
          </p>
        }
      >
        <PositionsGridSection season={season} />
      </Suspense>
    </div>
  );
}
