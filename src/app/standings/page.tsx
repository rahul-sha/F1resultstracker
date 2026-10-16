import { Suspense } from "react";
import { getDriverStandings, getConstructorStandings } from "@/lib/ergast";
import { currentSeason } from "@/lib/seasons";
import { teamColor } from "@/lib/team-colors";
import { teamDisplayName } from "@/lib/team-names";
import SeasonSelector from "@/components/SeasonSelector";

export const metadata = { title: "Standing | F1 Results Tracker" };

async function DriverStandingsTable({ season }: { season: number }) {
  const standings = await getDriverStandings(season);
  const maxPoints = Math.max(1, ...standings.map((s) => Number(s.points)));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr style={{ color: "var(--text-secondary)" }}>
            <th className="border-b px-2 py-2 text-left" style={{ borderColor: "var(--gridline)" }}>
              #
            </th>
            <th className="border-b px-2 py-2 text-left" style={{ borderColor: "var(--gridline)" }}>
              Driver
            </th>
            <th className="border-b px-2 py-2 text-left" style={{ borderColor: "var(--gridline)" }}>
              Team
            </th>
            <th className="border-b px-2 py-2 text-right" style={{ borderColor: "var(--gridline)" }}>
              Wins
            </th>
            <th className="border-b px-2 py-2" style={{ borderColor: "var(--gridline)" }}>
              Points
            </th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing) => {
            const constructor = standing.Constructors[standing.Constructors.length - 1];
            const color = teamColor(constructor?.constructorId ?? "unknown");
            const points = Number(standing.points);
            return (
              <tr key={standing.Driver.driverId}>
                <td
                  className="border-b px-2 py-1.5 tabular-nums"
                  style={{ borderColor: "var(--gridline)" }}
                >
                  {standing.position}
                </td>
                <td className="border-b px-2 py-1.5" style={{ borderColor: "var(--gridline)" }}>
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                  {standing.Driver.givenName} {standing.Driver.familyName}
                </td>
                <td
                  className="border-b px-2 py-1.5"
                  style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
                >
                  {constructor
                    ? teamDisplayName(constructor.constructorId, constructor.name)
                    : "—"}
                </td>
                <td
                  className="border-b px-2 py-1.5 text-right tabular-nums"
                  style={{ borderColor: "var(--gridline)" }}
                >
                  {standing.wins}
                </td>
                <td className="border-b px-2 py-1.5" style={{ borderColor: "var(--gridline)" }}>
                  <div className="flex items-center gap-2">
                    <div className="meter-track relative h-3 w-24 shrink-0 overflow-hidden rounded-sm">
                      <div
                        className="absolute inset-y-0 left-0 rounded-r-sm"
                        style={{ width: `${Math.max(2, (points / maxPoints) * 100)}%`, background: color }}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums">{points}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function ConstructorStandingsTable({ season }: { season: number }) {
  const standings = await getConstructorStandings(season);
  const maxPoints = Math.max(1, ...standings.map((s) => Number(s.points)));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr style={{ color: "var(--text-secondary)" }}>
            <th className="border-b px-2 py-2 text-left" style={{ borderColor: "var(--gridline)" }}>
              #
            </th>
            <th className="border-b px-2 py-2 text-left" style={{ borderColor: "var(--gridline)" }}>
              Team
            </th>
            <th className="border-b px-2 py-2 text-right" style={{ borderColor: "var(--gridline)" }}>
              Wins
            </th>
            <th className="border-b px-2 py-2" style={{ borderColor: "var(--gridline)" }}>
              Points
            </th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing) => {
            const color = teamColor(standing.Constructor.constructorId);
            const points = Number(standing.points);
            return (
              <tr key={standing.Constructor.constructorId}>
                <td
                  className="border-b px-2 py-1.5 tabular-nums"
                  style={{ borderColor: "var(--gridline)" }}
                >
                  {standing.position}
                </td>
                <td className="border-b px-2 py-1.5" style={{ borderColor: "var(--gridline)" }}>
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                  {teamDisplayName(standing.Constructor.constructorId, standing.Constructor.name)}
                </td>
                <td
                  className="border-b px-2 py-1.5 text-right tabular-nums"
                  style={{ borderColor: "var(--gridline)" }}
                >
                  {standing.wins}
                </td>
                <td className="border-b px-2 py-1.5" style={{ borderColor: "var(--gridline)" }}>
                  <div className="flex items-center gap-2">
                    <div className="meter-track relative h-3 w-24 shrink-0 overflow-hidden rounded-sm">
                      <div
                        className="absolute inset-y-0 left-0 rounded-r-sm"
                        style={{ width: `${Math.max(2, (points / maxPoints) * 100)}%`, background: color }}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums">{points}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function StandingsPage({
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
          <h1 className="text-2xl font-bold">Standing</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Championship standings for the {season} season.
          </p>
        </div>
        <SeasonSelector season={season} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            Drivers
          </h2>
          <Suspense fallback={<p className="text-sm">Loading…</p>}>
            <DriverStandingsTable season={season} />
          </Suspense>
        </section>
        <section>
          <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            Constructors
          </h2>
          <Suspense fallback={<p className="text-sm">Loading…</p>}>
            <ConstructorStandingsTable season={season} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
