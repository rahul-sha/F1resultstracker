import { Suspense } from "react";
import { buildPointsGrid } from "@/lib/points-grid";
import { buildConstructorPointsGrid } from "@/lib/constructor-points-grid";
import { currentSeason, resolvePersistedSeason } from "@/lib/seasons";
import PointsHeatmap from "@/components/PointsHeatmap";
import ConstructorPointsHeatmap from "@/components/ConstructorPointsHeatmap";

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

async function ConstructorPointsGridSection({ season }: { season: number }) {
  const grid = await buildConstructorPointsGrid(season);

  if (grid.rows.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        No results available yet for the {season} season.
      </p>
    );
  }

  return <ConstructorPointsHeatmap grid={grid} />;
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const params = await searchParams;
  const season = Number(params.season) || (await resolvePersistedSeason()) || currentSeason();

  return (
    <div className="px-[10px] py-6 sm:p-6">
      <div className="content-wrap">
        <div className="mb-4">
          <h1 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            Results
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Points scored by each driver per Grand Prix. Hover a race header for details;
            underlined races include a sprint.
          </p>
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
            <ConstructorPointsGridSection season={season} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
