import { Suspense } from "react";
import { buildPointsGrid } from "@/lib/points-grid";
import { buildFinishPositionSummary } from "@/lib/finish-positions";
import { currentSeason } from "@/lib/seasons";
import PointsHeatmap from "@/components/PointsHeatmap";
import FinishPositionsGrid from "@/components/FinishPositionsGrid";
import PodiumBars from "@/components/PodiumBars";
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

async function FinishPositionsSections({ season }: { season: number }) {
  const summary = await buildFinishPositionSummary(season);

  if (summary.drivers.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          Finish frequency
        </h2>
        <p className="mb-3 text-sm" style={{ color: "var(--text-muted)" }}>
          How often each driver has finished in each position this season, plus a DNF count.
        </p>
        <FinishPositionsGrid summary={summary} />
      </section>

      <section>
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
  const season = Number(params.season) || currentSeason();

  return (
    <div className="p-6">
      <div className="content-wrap">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Positions</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Where each driver finished in every Grand Prix, how often they finish in each
              position across the season, and their podium count. Darker is a stronger finish;
              retirements and non-classifications are shown in a neutral grey. Sprint weekends
              show the sprint finish as a small superscript next to the main race result.
            </p>
          </div>
          <SeasonSelector season={season} />
        </div>

        <div className="flex flex-col gap-8">
          <Suspense
            fallback={
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Loading {season} positions…
              </p>
            }
          >
            <PositionsGridSection season={season} />
          </Suspense>

          <Suspense fallback={<p className="text-sm">Loading…</p>}>
            <FinishPositionsSections season={season} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
