import { getConstructorStandings } from "@/lib/ergast";
import { teamColor } from "@/lib/team-colors";
import { teamDisplayName } from "@/lib/team-names";

export default async function ConstructorStandingsTable({ season }: { season: number }) {
  const standings = await getConstructorStandings(season);
  const maxPoints = Math.max(1, ...standings.map((s) => Number(s.points)));

  return (
    <div className="table-card">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ color: "var(--text-secondary)" }}>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Team</th>
              <th className="px-3 py-2 text-right">Wins</th>
              <th className="px-3 py-2">Points</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing) => {
              const color = teamColor(standing.Constructor.constructorId);
              const points = Number(standing.points);
              return (
                <tr key={standing.Constructor.constructorId}>
                  <td className="px-3 py-1.5 tabular-nums">{standing.position}</td>
                  <td className="px-3 py-1.5">
                    <span
                      className="mr-2 inline-block h-2.5 w-2.5 rounded-sm"
                      style={{ background: color }}
                    />
                    {teamDisplayName(standing.Constructor.constructorId, standing.Constructor.name)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{standing.wins}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="meter-track relative h-3 w-24 shrink-0 overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0"
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
    </div>
  );
}
