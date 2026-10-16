import { Suspense } from "react";
import { buildPointsGrid } from "@/lib/points-grid";
import { currentSeason } from "@/lib/seasons";
import PointsHeatmap from "@/components/PointsHeatmap";
import SeasonSelector from "@/components/SeasonSelector";
import ConstructorStandingsTable from "@/components/ConstructorStandingsTable";

export const metadata = { title: "Results | F1 Results Tracker" };

async function PointsGridSection({ season }: { season: number }) {
  const grid = await buildPointsGrid(season);

  if (grid.rows.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        No results available yet for the {season} season.
      </p>
    );
  }

  return <PointsHeatmap grid={grid} />;
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const params = await searchParams;
  const season = Number(params.season) || currentSeason();

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Results</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Points scored by each driver per Grand Prix. Hover a race header for details;
            underlined races include a sprint.
          </p>
        </div>
        <SeasonSelector season={season} />
      </div>

      <Suspense
        fallback={
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Loading {season} results…
          </p>
        }
      >
        <PointsGridSection season={season} />
      </Suspense>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Constructors
        </h2>
        <Suspense fallback={<p className="text-sm">Loading…</p>}>
          <ConstructorStandingsTable season={season} />
        </Suspense>
      </section>
    </div>
  );
}
