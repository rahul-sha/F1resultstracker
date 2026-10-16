import { Suspense } from "react";
import { buildFinishPositionSummary } from "@/lib/finish-positions";
import { currentSeason } from "@/lib/seasons";
import FinishPositionsGrid from "@/components/FinishPositionsGrid";
import PodiumBars from "@/components/PodiumBars";
import SeasonSelector from "@/components/SeasonSelector";

export const metadata = { title: "Finish Positions | F1 Results Tracker" };

async function FinishPositionsSections({ season }: { season: number }) {
  const summary = await buildFinishPositionSummary(season);

  if (summary.drivers.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        No results available yet for the {season} season.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <FinishPositionsGrid summary={summary} />

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

export default async function FinishPositionsPage({
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
          <h1 className="text-2xl font-bold">Finish Positions</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            How often each driver has finished in each position this season, plus a DNF
            count and the podium count for drivers and teams.
          </p>
        </div>
        <SeasonSelector season={season} />
      </div>

      <Suspense
        fallback={
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Loading {season} finish positions…
          </p>
        }
      >
        <FinishPositionsSections season={season} />
      </Suspense>
    </div>
  );
}
