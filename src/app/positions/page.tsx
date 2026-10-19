import { Suspense } from "react";
import { buildPointsGrid } from "@/lib/points-grid";
import { buildFinishPositionSummary } from "@/lib/finish-positions";
import { buildQualifyingPositionSummary } from "@/lib/qualifying-positions";
import { currentSeason, resolvePersistedSeason } from "@/lib/seasons";
import PointsHeatmap from "@/components/PointsHeatmap";
import FinishPositionsGrid from "@/components/FinishPositionsGrid";
import QualifyingPositionsGrid from "@/components/QualifyingPositionsGrid";
import PodiumBars from "@/components/PodiumBars";

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

async function QualifyingPositionsSection({ season }: { season: number }) {
  const summary = await buildQualifyingPositionSummary(season);

  const hasData = summary.drivers.some((d) => Object.keys(d.countsByPosition).length > 0);
  if (!hasData) {
    return null;
  }

  return (
    <section id="positions-qualifying" data-rail-label="Qualifying frequency">
      <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
        Qualifying frequency
      </h2>
      <p className="mb-3 text-sm" style={{ color: "var(--text-muted)" }}>
        How often each driver has qualified in each grid position this season, ranked by average
        qualifying position rather than the championship standings.
      </p>
      <QualifyingPositionsGrid summary={summary} />
    </section>
  );
}

async function FinishPositionsSections({ season }: { season: number }) {
  const summary = await buildFinishPositionSummary(season);

  if (summary.drivers.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <section id="positions-finish" data-rail-label="Finish frequency">
        <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Finish frequency
        </h2>
        <p className="mb-3 text-sm" style={{ color: "var(--text-muted)" }}>
          How often each driver has finished in each position this season, plus a DNF count.
        </p>
        <FinishPositionsGrid summary={summary} />
      </section>

      <Suspense fallback={null}>
        <QualifyingPositionsSection season={season} />
      </Suspense>

      <section id="positions-podiums" data-rail-label="Podium finishes">
        <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Podium finishes
        </h2>
        <p className="mb-3 text-sm" style={{ color: "var(--text-muted)" }}>
          How many 1st/2nd/3rd place finishes each driver and team has this season. Drivers with
          no podiums are left off the list.
        </p>
        <PodiumBars
          drivers={summary.driverPodiums.map((d) => ({
            label: d.code,
            team: d.constructorName,
            color: d.color,
            podiums: d.podiums,
          }))}
          teams={summary.teamPodiums.map((t) => ({
            label: t.constructorName,
            color: t.color,
            podiums: t.podiums,
          }))}
        />
      </section>
    </div>
  );
}

export default async function PositionsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const params = await searchParams;
  const season = Number(params.season) || (await resolvePersistedSeason()) || currentSeason();

  return (
    <div className="px-[10px] py-6 sm:p-6">
      <div className="content-wrap">
        <div className="page-header mb-4">
          <h1 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            Positions
          </h1>
          <p className="text-sm">
            Where each driver finished in every Grand Prix, how often they finish in each
            position across the season, and their podium count. Darker is a stronger finish;
            retirements and non-classifications are shown in a neutral grey. Sprint weekends show
            the sprint finish as a small superscript next to the main race result.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <div id="positions-heatmap" data-rail-label="Positions heatmap">
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

          <Suspense fallback={<p className="text-sm">Loading…</p>}>
            <FinishPositionsSections season={season} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
