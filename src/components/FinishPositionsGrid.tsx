"use client";

import { useRef } from "react";
import type { FinishPositionSummary } from "@/lib/finish-positions";
import { useDragPan } from "./PointsHeatmap";

export default function FinishPositionsGrid({ summary }: { summary: FinishPositionSummary }) {
  const positions = Array.from({ length: summary.maxPosition }, (_, i) => i + 1);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragPan = useDragPan(scrollerRef);

  return (
    <div className="table-card scroll-grid">
      <div className="overflow-x-auto" ref={scrollerRef} {...dragPan}>
      <table className="border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 min-w-[84px] sm:min-w-[180px] px-2 sm:px-3 py-2 text-left text-xs font-semibold" />
            {positions.map((p) => (
              <th key={p} className="w-9 min-w-9 sm:w-11 sm:min-w-11 px-0.5 py-2 text-center text-[10px] sm:text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
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
                  if (!count) return <td key={p} className="w-9 h-8 min-w-9 sm:w-11 sm:h-9 sm:min-w-11" />;
                  // The most-frequent cell is always bucket 6 (count/rowMax
                  // rounds to the top of the ramp) so the shading alone
                  // already marks it — no separate ring needed, which only
                  // added a boxy border that clashed with the rest of the
                  // site's flat, borderless cells.
                  const bucket = Math.max(1, Math.round((count / rowMax) * 6));
                  return (
                    <td
                      key={p}
                      className="count-cell w-9 h-8 sm:w-11 sm:h-9 text-center text-[11px] sm:text-xs"
                      style={{
                        background: `var(--heat-${bucket})`,
                        color: bucket >= 4 ? "var(--heat-fg-hi)" : "var(--heat-fg-lo)",
                      }}
                    >
                      {count}
                    </td>
                  );
                })}
                <td
                  className="dnf-cell sticky right-0 z-10 px-2 py-1 text-center"
                  style={{ color: "var(--text-muted)" }}
                >
                  {row.dnfs || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <div className="legend">
        <span className="legend-chip">
          <span className="legend-swatch" style={{ background: "var(--heat-4)" }} />
          Finishes at that position — darkest is the driver&apos;s most frequent finish
        </span>
        <span className="legend-chip">DNFs: retirements, disqualifications and withdrawals</span>
      </div>
    </div>
  );
}
