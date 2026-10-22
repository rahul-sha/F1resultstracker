import { Suspense } from "react";
import { buildPointsGrid } from "@/lib/points-grid";
import { buildConstructorPointsGrid } from "@/lib/constructor-points-grid";
import { currentSeason, resolvePersistedSeason } from "@/lib/seasons";
import PointsHeatmap from "@/components/PointsHeatmap";
import ConstructorPointsHeatmap from "@/components/ConstructorPointsHeatmap";
import DriverPointsEvolutionChart from "@/components/DriverPointsEvolutionChart";
import ConstructorPointsEvolutionChart from "@/components/ConstructorPointsEvolutionChart";
import ShareButton from "@/components/ShareButton";

export const metadata = { title: "Results | Grid Walk" };

async function PointsGridSection({ season }: { season: number }) {
  const grid = await buildPointsGrid(season);

  if (grid.rows.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        No results available yet for the {season} season.
      </p>
    );
  }

  return (
    <>
      <PointsHeatmap grid={grid} />
      <p className="graphic-caption">
        Hover a race header for details; underlined races include a sprint.
      </p>
    </>
  );
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

// buildPointsGrid's underlying fetches are all wrapped in React's cache()
// (ergast.ts), so re-calling it here for the same season costs no extra
// network requests — the schedule/standings/results already fetched for
// the heatmap section above are reused.
async function DriverEvolutionSection({ season }: { season: number }) {
  const grid = await buildPointsGrid(season);
  if (grid.rows.length === 0) return null;

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="section-header">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            Driver Points Evolution
          </h2>
          <p className="text-sm">Cumulative points scored by each driver across the season.</p>
        </div>
        <ShareButton
          targetId="results-evolution-drivers"
          fileName={`f1-points-evolution-${season}`}
          label="the Driver Points Evolution chart"
        />
      </div>
      <DriverPointsEvolutionChart grid={grid} />
      <p className="graphic-caption">Hover a point or flag for race detail.</p>
    </>
  );
}

// Same cache()-backed reuse as above, for the constructor standings data.
async function ConstructorEvolutionSection({ season }: { season: number }) {
  const grid = await buildConstructorPointsGrid(season);
  if (grid.rows.length === 0) return null;

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="section-header">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            Constructors Points Evolution
          </h2>
          <p className="text-sm">Cumulative points scored by each team across the season.</p>
        </div>
        <ShareButton
          targetId="results-evolution-constructors"
          fileName={`f1-constructors-evolution-${season}`}
          label="the Constructors Points Evolution chart"
        />
      </div>
      <ConstructorPointsEvolutionChart grid={grid} />
      <p className="graphic-caption">Hover a point or flag for race detail.</p>
    </>
  );
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
        <div className="flex items-start justify-between gap-4">
          <div className="page-header">
            <h1 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Results
            </h1>
            <p className="text-sm">Points scored by each driver per Grand Prix.</p>
          </div>
          <ShareButton targetId="results-heatmap" fileName={`f1-results-${season}`} label="the Results heatmap" />
        </div>

        <div id="results-heatmap" data-rail-label="Results heatmap">
          <Suspense
            fallback={
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Loading {season} results…
              </p>
            }
          >
            <PointsGridSection season={season} />
          </Suspense>
        </div>

        <section id="results-constructors" data-rail-label="Constructors" className="mt-8">
          <div className="flex items-start justify-between gap-4">
            <div className="section-header">
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                Constructors
              </h2>
              <p className="text-sm">Points scored by each team per Grand Prix.</p>
            </div>
            <ShareButton targetId="results-constructors" fileName={`f1-constructors-${season}`} label="the Constructors heatmap" />
          </div>
          <Suspense fallback={<p className="text-sm">Loading…</p>}>
            <ConstructorPointsGridSection season={season} />
          </Suspense>
        </section>

        <div id="results-evolution-drivers" data-rail-label="Points evolution" className="mt-8">
          <Suspense fallback={<p className="text-sm">Loading…</p>}>
            <DriverEvolutionSection season={season} />
          </Suspense>
        </div>

        <div id="results-evolution-constructors" className="mt-8">
          <Suspense fallback={<p className="text-sm">Loading…</p>}>
            <ConstructorEvolutionSection season={season} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
