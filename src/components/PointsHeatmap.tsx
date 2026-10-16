import type { PointsGrid, PointsCell } from "@/lib/points-grid";

const ORDINAL_SUFFIX = (day: number) => {
  if (day % 100 >= 11 && day % 100 <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

// "25th Aug", no year — matches how broadcast graphics write race dates.
function formatRaceDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${day}${ORDINAL_SUFFIX(day)} ${month}`;
}

function RoundHeader({
  round,
  abbreviation,
  raceName,
  flagIso,
  date,
  hasSprint,
}: {
  round: number;
  abbreviation: string;
  raceName: string;
  flagIso: string | null;
  date: string;
  hasSprint: boolean;
}) {
  return (
    <th
      className="round-header w-11 px-1 py-2 text-center text-[11px] font-semibold"
      style={{ color: "var(--text-secondary)" }}
    >
      <div className={"round-chip" + (hasSprint ? " round-chip-sprint" : "")}>
        {flagIso ? <span className={`fi fi-${flagIso} round-flag`} aria-hidden="true" /> : null}
        <span>{abbreviation}</span>
        <div className="round-tooltip" role="tooltip">
          <div className="round-tooltip-title">
            Round {round} &middot; {raceName}
          </div>
          <div className="round-tooltip-row">
            <span>Date</span>
            <b>{formatRaceDate(date)}</b>
          </div>
          {hasSprint ? (
            <div className="round-tooltip-row">
              <span>Format</span>
              <b>Sprint weekend</b>
            </div>
          ) : null}
        </div>
      </div>
    </th>
  );
}

function Cell({
  cell,
  max,
  driverName,
  constructorName,
  hasSprint,
}: {
  cell: PointsCell | null;
  max: number;
  driverName: string;
  constructorName: string;
  hasSprint: boolean;
}) {
  if (cell === null) {
    return <td className="w-11 h-9 border" style={{ borderColor: "var(--gridline)" }} />;
  }
  // Bucket into the active theme's 7-stop --heat-0..--heat-6 ramp (defined
  // per accent palette in globals.css) rather than a fixed hardcoded ramp,
  // so the heatmap re-colors itself when the palette changes.
  const t = max > 0 ? cell.points / max : 0;
  const bucket = Math.round(t * 6);
  const style = {
    borderColor: "var(--gridline)",
    background: `var(--heat-${bucket})`,
    color: bucket >= 4 ? "var(--heat-fg-hi)" : "var(--heat-fg-lo)",
  } as React.CSSProperties;
  return (
    <td className="w-11 h-9 border text-center text-xs font-medium tabular-nums" style={style}>
      <div className="cell-inner">
        {cell.points}
        <div className="cell-tooltip" role="tooltip">
          <div className="round-tooltip-title">
            {driverName} ({constructorName})
          </div>
          {cell.position ? (
            <div className="round-tooltip-row">
              <span>Position</span>
              <b>{cell.position}</b>
            </div>
          ) : null}
          {cell.status ? (
            <div className="round-tooltip-row">
              <span>Status</span>
              <b>{cell.status}</b>
            </div>
          ) : null}
          <div className="round-tooltip-row">
            <span>Race points</span>
            <b>{cell.racePoints}</b>
          </div>
          {hasSprint ? (
            <div className="round-tooltip-row">
              <span>Sprint points</span>
              <b>{cell.sprintPoints ?? 0}</b>
            </div>
          ) : null}
        </div>
      </div>
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
            />
            {grid.columns.map((col) => (
              <RoundHeader
                key={col.round}
                round={col.round}
                abbreviation={col.abbreviation}
                raceName={col.raceName}
                flagIso={col.flagIso}
                date={col.date}
                hasSprint={col.hasSprint}
              />
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
          {grid.rows.map((row, i) => {
            const seasonSegments = row.pointsByRound
              .filter((c): c is PointsCell => c !== null && c.points > 0)
              .map((c, idx) => ({ points: c.points, key: idx }));
            const barPct = Math.max(2, (row.seasonPoints / grid.maxSeasonPoints) * 100);

            return (
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
                {row.pointsByRound.map((cell, idx) => (
                  <Cell
                    key={grid.columns[idx].round}
                    cell={cell}
                    max={grid.maxRoundPoints}
                    driverName={row.name}
                    constructorName={row.constructorName}
                    hasSprint={grid.columns[idx].hasSprint}
                  />
                ))}
                <td className="border px-3 py-1.5" style={{ borderColor: "var(--gridline)" }}>
                  <div className="flex items-center gap-2">
                    <div className="season-meter-shell relative h-4 w-32 shrink-0 overflow-hidden rounded-sm">
                      <div className="season-meter-track" style={{ width: `${barPct}%` }}>
                        {seasonSegments.map((seg) => (
                          <div
                            key={seg.key}
                            className="season-meter-seg h-full"
                            style={{
                              width: `${(seg.points / row.seasonPoints) * 100}%`,
                              background: row.color,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <span
                      className="text-xs font-semibold tabular-nums"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {row.seasonPoints}
                    </span>
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
