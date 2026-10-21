"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { PointsGridColumn } from "@/lib/points-grid";
import { useTooltip, useDragPan, Tooltip } from "./PointsHeatmap";

export interface EvolutionSeriesInput {
  id: string;
  label: string;
  color: string;
  pointsByRound: (number | null)[];
}

const CHART_HEIGHT = 220;
const ROUND_WIDTH = 36;
const PAD_LEFT = 40;
const PAD_TOP = 14;
const PAD_BOTTOM = 10;
const FLAG_ROW_HEIGHT = 24;
// Staggers each line's draw-in slightly, like cars peeling off the grid,
// capped so a 20+ driver field doesn't drag the reveal out too long.
const REVEAL_STAGGER_MS = 60;
const REVEAL_STAGGER_CAP_MS = 700;
const REVEAL_DURATION_MS = 2200;
const AREA_OPACITY = 0.14;

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

// Fires once, the first time the chart scrolls into view, so the draw-in
// plays on arrival rather than replaying on every scroll past it; skipped
// (revealed immediately, no animation) for prefers-reduced-motion.
function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, revealed };
}

export default function PointsEvolutionChart({
  columns,
  series: rawSeries,
}: {
  columns: PointsGridColumn[];
  series: EvolutionSeriesInput[];
}) {
  const { tooltip, show, hide } = useTooltip();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragPan = useDragPan(scrollerRef);
  const { ref: revealRef, revealed } = useRevealOnScroll<HTMLDivElement>();

  const series = useMemo(
    () =>
      rawSeries.map((s) => {
        let total = 0;
        const cumulative = s.pointsByRound.map((points) => {
          total += points ?? 0;
          return total;
        });
        return { ...s, cumulative };
      }),
    [rawSeries]
  );

  const maxCumulative = Math.max(1, ...series.map((s) => s.cumulative[s.cumulative.length - 1] ?? 0));
  const { ticks, axisMax } = computeTicks(maxCumulative);

  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const plotWidth = Math.max(1, columns.length - 1) * ROUND_WIDTH + PAD_LEFT;

  const x = (roundIndex: number) => PAD_LEFT / 2 + roundIndex * ROUND_WIDTH;
  const y = (value: number) => PAD_TOP + plotHeight - (value / axisMax) * plotHeight;

  // Draw the strongest season so far on top, so a tight leading battle
  // doesn't get visually buried under the midfield lines beneath it.
  const drawOrder = [...series].sort(
    (a, b) => (a.cumulative[a.cumulative.length - 1] ?? 0) - (b.cumulative[b.cumulative.length - 1] ?? 0)
  );

  return (
    <div className="table-card">
      <div className="flex" ref={revealRef}>
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

            {drawOrder.map((s, idx) => {
              const lineD = s.cumulative
                .map((value, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(value)}`)
                .join(" ");
              const baseline = y(0);
              const lastX = x(s.cumulative.length - 1);
              const areaD = `${lineD} L ${lastX} ${baseline} L ${x(0)} ${baseline} Z`;
              const delay = Math.min(idx * REVEAL_STAGGER_MS, REVEAL_STAGGER_CAP_MS);
              return (
                <g key={s.id}>
                  {/* Material 3 tonal fill — a soft wash of the line's own
                      colour under it, the same "tonal container" idea used
                      for surfaces elsewhere in the app, not just a bare
                      stroke on a blank plot. */}
                  <path
                    d={areaD}
                    fill={s.color}
                    stroke="none"
                    className={"evo-area" + (revealed ? " evo-area-shown" : "")}
                    style={
                      {
                        transitionDelay: `${delay}ms`,
                        "--evo-area-opacity": AREA_OPACITY,
                      } as CSSProperties
                    }
                  />
                  <path
                    d={lineD}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={3}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    pathLength={1}
                    className={"evo-line" + (revealed ? " evo-line-shown" : "")}
                    style={{ transitionDuration: `${REVEAL_DURATION_MS}ms`, transitionDelay: `${delay}ms` }}
                  />
                </g>
              );
            })}

            {drawOrder.map((s) =>
              s.cumulative.map((value, i) => (
                <circle
                  key={`${s.id}-${i}`}
                  cx={x(i)}
                  cy={y(value)}
                  r={6}
                  fill="transparent"
                  onMouseEnter={(e) =>
                    show(
                      e,
                      <>
                        <div className="heatmap-tooltip-title">{s.label}</div>
                        <div className="heatmap-tooltip-row">
                          <span>Round {columns[i].round}</span>
                          <b>{columns[i].abbreviation}</b>
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
            {drawOrder.map((s, sIdx) => {
              const n = s.cumulative.length;
              const driverDelay = Math.min(sIdx * REVEAL_STAGGER_MS, REVEAL_STAGGER_CAP_MS);
              return s.cumulative.map((value, i) => {
                // Pops in as the line sweeps past its x position, not all at
                // once — so the dots read as the line "catching up" to each
                // round rather than scattering onto the chart pre-formed.
                const dotDelay = driverDelay + (n > 1 ? (i / (n - 1)) * REVEAL_DURATION_MS : 0);
                return (
                  <circle
                    key={`${s.id}-${i}-dot`}
                    cx={x(i)}
                    cy={y(value)}
                    r={i === n - 1 ? 4.5 : 2.5}
                    fill={s.color}
                    className={"evo-dot" + (revealed ? " evo-dot-shown" : "")}
                    style={{ transitionDelay: `${dotDelay}ms`, pointerEvents: "none" }}
                  />
                );
              });
            })}
          </svg>

          <div style={{ position: "relative", width: plotWidth, height: FLAG_ROW_HEIGHT }}>
            {columns.map((col, idx) =>
              col.flagIso ? (
                <span
                  key={col.round}
                  className={`fi fi-${col.flagIso} round-flag`}
                  style={{ position: "absolute", left: x(idx) - 11, top: 2 }}
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
