import type { PointsGrid } from "@/lib/points-grid";
import { sequentialBlue, textOnSequential } from "@/lib/viz-colors";

function Cell({ value, max }: { value: number | null; max: number }) {
  if (value === null) {
    return <td className="w-11 h-9 border" style={{ borderColor: "var(--gridline)" }} />;
  }
  const t = max > 0 ? value / max : 0;
  const fill = sequentialBlue(t);
  const textColor = textOnSequential(t);
  return (
    <td
      className="group relative w-11 h-9 border text-center text-xs font-medium tabular-nums cursor-default"
      style={{ borderColor: "var(--gridline)", background: fill, color: textColor }}
    >
      {value}
    </td>
  );
}

export default function PointsHeatmap({ grid }: { grid: PointsGrid }) {
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse" style={{ borderColor: "var(--gridline)" }}>
        <thead>
          <tr>
            <th
              className="sticky left-0 z-10 w-10 border px-2 py-2 text-left text-xs font-semibold"
              style={{ borderColor: "var(--gridline)", background: "var(--surface-1)" }}
            >
              #
            </th>
            <th
              className="sticky left-10 z-10 min-w-[160px] border px-3 py-2 text-left text-xs font-semibold"
              style={{ borderColor: "var(--gridline)", background: "var(--surface-1)" }}
            >
              Driver
            </th>
            {grid.columns.map((col) => (
              <th
                key={col.round}
                className="w-11 border px-1 py-2 text-center text-[11px] font-semibold"
                style={{
                  borderColor: "var(--gridline)",
                  color: "var(--text-secondary)",
                  textDecoration: col.hasSprint ? "underline" : "none",
                }}
                title={col.raceName + (col.hasSprint ? " (sprint weekend)" : "")}
              >
                <div>{col.flag}</div>
                <div>{col.abbreviation}</div>
              </th>
            ))}
            <th
              className="min-w-[180px] border px-3 py-2 text-left text-xs font-semibold"
              style={{ borderColor: "var(--gridline)" }}
            >
              Season points
            </th>
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row, i) => (
            <tr key={row.driverId}>
              <td
                className="sticky left-0 z-10 border px-2 py-1.5 text-xs font-semibold tabular-nums"
                style={{ borderColor: "var(--gridline)", background: "var(--surface-1)" }}
              >
                {i + 1}
              </td>
              <td
                className="sticky left-10 z-10 border px-3 py-1.5 text-xs"
                style={{ borderColor: "var(--gridline)", background: "var(--surface-1)" }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ background: row.color }}
                  />
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {row.code}
                  </span>
                  <span className="truncate" style={{ color: "var(--text-secondary)" }}>
                    {row.constructorName}
                  </span>
                </div>
              </td>
              {row.pointsByRound.map((value, idx) => (
                <Cell key={grid.columns[idx].round} value={value} max={grid.maxRoundPoints} />
              ))}
              <td className="border px-3 py-1.5" style={{ borderColor: "var(--gridline)" }}>
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 flex-1 rounded-r-sm"
                    style={{
                      width: `${Math.max(4, (row.seasonPoints / grid.maxSeasonPoints) * 100)}%`,
                      background: row.color,
                    }}
                  />
                  <span
                    className="text-xs font-semibold tabular-nums"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {row.seasonPoints}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
