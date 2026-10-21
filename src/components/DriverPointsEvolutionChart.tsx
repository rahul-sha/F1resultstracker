"use client";

import { useMemo, useRef } from "react";
import type { PointsGrid } from "@/lib/points-grid";
import { useTooltip, useDragPan, Tooltip } from "./PointsHeatmap";

const CHART_HEIGHT = 260;
const ROUND_WIDTH = 40;
const PAD_LEFT = 44;
const PAD_TOP = 14;
const PAD_BOTTOM = 10;
const FLAG_ROW_HEIGHT = 26;

// Round a max value up to a "nice" axis ceiling (1/2/5/10 × a power of ten)
// and pick an even step toward ~5 gridlines, the same rule a real telemetry
// graphic would use rather than an arbitrary fixed tick count.
function computeTicks(maxValue: number): { ticks: number[]; axisMax: number } {
  const safeMax = Math.max(maxValue, 1);
  const rawStep = safeMax / 5;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  const niceResidual = residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1;
  const step = niceResidual * magnitude;
  const axisMax = Math.ceil(safeMax / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= axisMax + 1e-6; v += step) ticks.push(Math.round(v));
  return { ticks, axisMax };
}

export default function DriverPointsEvolutionChart({ grid }: { grid: PointsGrid }) {
  const { tooltip, show, hide } = useTooltip();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragPan = useDragPan(scrollerRef);

  const series = useMemo(
    () =>
      grid.rows.map((row) => {
        let total = 0;
        const cumulative = row.pointsByRound.map((cell) => {
          total += cell?.points ?? 0;
          return total;
        });
        return { ...row, cumulative };
      }),
    [grid]
  );

  const maxCumulative = Math.max(1, ...series.map((s) => s.cumulative[s.cumulative.length - 1] ?? 0));
  const { ticks, axisMax } = computeTicks(maxCumulative);

  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const plotWidth = Math.max(1, grid.columns.length - 1) * ROUND_WIDTH + PAD_LEFT;

  const x = (roundIndex: number) => PAD_LEFT / 2 + roundIndex * ROUND_WIDTH;
  const y = (value: number) => PAD_TOP + plotHeight - (value / axisMax) * plotHeight;

  // Draw the strongest season so far on top, so a tight leading battle
  // doesn't get visually buried under the midfield lines beneath it.
  const drawOrder = [...series].sort(
    (a, b) => (a.cumulative[a.cumulative.length - 1] ?? 0) - (b.cumulative[b.cumulative.length - 1] ?? 0)
  );

  return (
    <div className="table-card">
      <div className="flex">
        <svg width={PAD_LEFT} height={CHART_HEIGHT + FLAG_ROW_HEIGHT} className="shrink-0">
          {ticks.map((tick) => (
            <text
              key={tick}
              x={PAD_LEFT - 8}
              y={y(tick)}
              dy="0.32em"
              textAnchor="end"
              fontSize={10}
              fill="var(--text-muted)"
            >
              {tick}
            </text>
          ))}
        </svg>

        <div className="overflow-x-auto" ref={scrollerRef} {...dragPan}>
          <svg width={plotWidth} height={CHART_HEIGHT}>
            {ticks.map((tick) => (
              <line
                key={tick}
                x1={0}
                x2={plotWidth}
                y1={y(tick)}
                y2={y(tick)}
                stroke={tick === 0 ? "var(--baseline)" : "var(--gridline)"}
                strokeWidth={tick === 0 ? 1.5 : 1}
              />
            ))}

            {drawOrder.map((row) => {
              const d = row.cumulative
                .map((value, idx) => `${idx === 0 ? "M" : "L"} ${x(idx)} ${y(value)}`)
                .join(" ");
              return (
                <path key={row.driverId} d={d} fill="none" stroke={row.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              );
            })}

            {drawOrder.map((row) =>
              row.cumulative.map((value, idx) => (
                <circle
                  key={`${row.driverId}-${idx}`}
                  cx={x(idx)}
                  cy={y(value)}
                  r={6}
                  fill="transparent"
                  onMouseEnter={(e) =>
                    show(
                      e,
                      <>
                        <div className="heatmap-tooltip-title">{row.name}</div>
                        <div className="heatmap-tooltip-row">
                          <span>Round {grid.columns[idx].round}</span>
                          <b>{grid.columns[idx].abbreviation}</b>
                        </div>
                        <div className="heatmap-tooltip-row">
                          <span>Cumulative points</span>
                          <b>{value}</b>
                        </div>
                      </>
                    )
                  }
                  onMouseLeave={hide}
                />
              ))
            )}
            {drawOrder.map((row) =>
              row.cumulative.map((value, idx) => (
                <circle
                  key={`${row.driverId}-${idx}-dot`}
                  cx={x(idx)}
                  cy={y(value)}
                  r={2.5}
                  fill={row.color}
                  style={{ pointerEvents: "none" }}
                />
              ))
            )}
          </svg>

          <div style={{ position: "relative", width: plotWidth, height: FLAG_ROW_HEIGHT }}>
            {grid.columns.map((col, idx) =>
              col.flagIso ? (
                <span
                  key={col.round}
                  className={`fi fi-${col.flagIso} round-flag`}
                  style={{ position: "absolute", left: x(idx) - 11, top: 4 }}
                  onMouseEnter={(e) =>
                    show(
                      e,
                      <div className="heatmap-tooltip-title">
                        Round {col.round} &middot; {col.raceName}
                      </div>
                    )
                  }
                  onMouseLeave={hide}
                />
              ) : null
            )}
          </div>
        </div>
      </div>
      <Tooltip tooltip={tooltip} />
    </div>
  );
}
