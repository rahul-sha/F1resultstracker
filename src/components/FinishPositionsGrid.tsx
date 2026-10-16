import type { FinishPositionSummary } from "@/lib/finish-positions";

function MechanicalIcon() {
  return (
    <svg className="dnf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14.7 6.3a4 4 0 00-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 005.4-5.4l-2.1 2.1a2 2 0 01-2.8-2.8z" />
    </svg>
  );
}

function OtherDnfIcon() {
  return (
    <svg className="dnf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3L2 20h20L12 3z" />
      <path d="M12 9v5M12 17h.01" />
    </svg>
  );
}

export default function FinishPositionsGrid({ summary }: { summary: FinishPositionSummary }) {
  const positions = Array.from({ length: summary.maxPosition }, (_, i) => i + 1);

  return (
    <div className="table-card overflow-x-auto">
      <table className="border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-[84px] sm:min-w-[180px] px-2 sm:px-3 py-2 text-left text-xs font-semibold" />
            {positions.map((p) => (
              <th key={p} className="w-11 px-0.5 py-2 text-center text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                {p}
              </th>
            ))}
            <th className="sticky right-0 z-10 min-w-[64px] sm:min-w-[96px] px-2 py-2 text-center text-[10px] font-bold uppercase" style={{ color: "var(--text-muted)" }}>
              DNFs
            </th>
          </tr>
        </thead>
        <tbody>
          {summary.drivers.map((row) => {
            const rowMax = Math.max(1, ...Object.values(row.countsByPosition));
            return (
              <tr key={row.driverId}>
                <td className="sticky left-0 z-10 px-2 sm:px-3 py-1 text-xs">
                  <div className="driver-cell">
                    <span className="driver-cell-position tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {row.standingsPosition}
                    </span>
                    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: row.color }} />
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {row.code}
                    </span>
                    <span className="driver-cell-team hidden truncate sm:inline" style={{ color: "var(--text-secondary)" }}>
                      {row.constructorName}
                    </span>
                  </div>
                </td>
                {positions.map((p) => {
                  const count = row.countsByPosition[p];
                  if (!count) return <td key={p} className="w-11 h-9" />;
                  const bucket = Math.max(1, Math.round((count / rowMax) * 6));
                  const isMode = count === rowMax;
                  return (
                    <td
                      key={p}
                      className={"count-cell w-11 h-9 text-center" + (isMode ? " count-mode" : "")}
                      style={{
                        background: `var(--heat-${bucket})`,
                        color: bucket >= 4 ? "var(--heat-fg-hi)" : "var(--heat-fg-lo)",
                      }}
                    >
                      {count}
                    </td>
                  );
                })}
                <td className="dnf-cell sticky right-0 z-10 px-2 py-1 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {row.mechanicalDnfs ? (
                      <span>
                        <MechanicalIcon /> {row.mechanicalDnfs}
                      </span>
                    ) : null}
                    {row.otherDnfs ? (
                      <span>
                        <OtherDnfIcon /> {row.otherDnfs}
                      </span>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="legend">
        <span className="legend-chip">
          <span className="legend-swatch" style={{ background: "var(--heat-4)" }} />
          Finishes at that position (darker = more often)
        </span>
        <span className="legend-chip">
          <span className="legend-swatch count-mode" style={{ background: "var(--heat-4)" }} />
          Driver&apos;s most frequent finish
        </span>
        <span className="legend-chip">
          <MechanicalIcon /> Mechanical DNF
        </span>
        <span className="legend-chip">
          <OtherDnfIcon /> Other DNF (accident, DSQ, withdrawn)
        </span>
      </div>
    </div>
  );
}
