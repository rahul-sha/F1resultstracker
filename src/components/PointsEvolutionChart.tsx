"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { PointsGridColumn } from "@/lib/points-grid";
import { useTooltip, useDragPan, Tooltip } from "./PointsHeatmap";

export interface EvolutionSeriesInput {
  id: string;
  label: string;
  code: string;
  color: string;
  pointsByRound: (number | null)[];
}

const CHART_HEIGHT = 220;
const ROUND_WIDTH = 36;
const PAD_LEFT = 20;
const PAD_TOP = 14;
const PAD_BOTTOM = 10;
const FLAG_ROW_HEIGHT = 24;
// Staggers each line's draw-in slightly, like cars peeling off the grid,
// capped so a 20+ driver field doesn't drag the reveal out too long.
const REVEAL_STAGGER_MS = 60;
const REVEAL_STAGGER_CAP_MS = 700;
const REVEAL_DURATION_MS = 2200;
const AREA_OPACITY = 0.14;

// The end-of-line totals column, outside the horizontal scroller so it
// keeps showing the latest standings even when the plot itself is
// scrolled back to an earlier round.
const BUBBLE_COL_WIDTH = 104;
const BUBBLE_WIDTH = 92;
const BUBBLE_HEIGHT = 22;
const BUBBLE_FILL_OPACITY = 0.16;
// Minimum vertical distance between two bubbles' centres before one has
// to be nudged off its line's real value to avoid overlapping the next.
const BUBBLE_MIN_SPACING = BUBBLE_HEIGHT + 2;

function computeAxisMax(maxValue: number): number {
  // Headroom only — ticks/gridlines are gone now that the scale itself
  // is hidden, so there's no "nice number" to round to any more.
  return Math.max(1, maxValue) * 1.08;
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
  const axisMax = computeAxisMax(maxCumulative);

  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const plotWidth = Math.max(1, columns.length - 1) * ROUND_WIDTH + PAD_LEFT;

  const x = (roundIndex: number) => PAD_LEFT / 2 + roundIndex * ROUND_WIDTH;
  const y = (value: number) => PAD_TOP + plotHeight - (value / axisMax) * plotHeight;

  // Draw the strongest season so far on top, so a tight leading battle
  // doesn't get visually buried under the midfield lines beneath it.
  const drawOrder = [...series].sort(
    (a, b) => (a.cumulative[a.cumulative.length - 1] ?? 0) - (b.cumulative[b.cumulative.length - 1] ?? 0)
  );

  // End-of-line totals, nudged apart just enough to stay legible when two
  // drivers are close in points — top (highest value) down, each bubble
  // pushed below the one above it rather than letting them overlap. A full
  // driver field (20+ cars) can't all fit a 220px-tall column at a legible
  // spacing, so only as many bubbles as actually fit get one; the rest keep
  // their line and dot, with the exact value still available on hover.
  const bubbleMinY = PAD_TOP;
  const bubbleMaxY = CHART_HEIGHT - BUBBLE_HEIGHT / 2;
  const maxBubbles = Math.max(1, Math.floor((bubbleMaxY - bubbleMinY) / BUBBLE_MIN_SPACING) + 1);
  const bubbles = useMemo(() => {
    const byValueDesc = [...series].sort(
      (a, b) => (b.cumulative[b.cumulative.length - 1] ?? 0) - (a.cumulative[a.cumulative.length - 1] ?? 0)
    );
    type Bubble = { id: string; code: string; color: string; value: number; lineY: number; bubbleY: number };
    const picked = byValueDesc.slice(0, maxBubbles);

    // Pass 1 (top-down): push each bubble below the one above it.
    const pass1 = picked.reduce<Bubble[]>((acc, s) => {
      const value = s.cumulative[s.cumulative.length - 1] ?? 0;
      const lineY = y(value);
      const prevY = acc.length > 0 ? acc[acc.length - 1].bubbleY : -Infinity;
      const bubbleY = Math.max(lineY, prevY + BUBBLE_MIN_SPACING);
      return [...acc, { id: s.id, code: s.code, color: s.color, value, lineY, bubbleY }];
    }, []);

    // Pass 2 (bottom-up): pass 1 can push the last bubble past the bottom
    // of the chart when several series cluster together; pull everything
    // back up from the bottom so the whole stack fits inside the chart,
    // still spaced apart, instead of letting the overflow collide.
    const result = [...pass1];
    for (let i = result.length - 1; i >= 0; i--) {
      const ceiling = i === result.length - 1 ? bubbleMaxY : result[i + 1].bubbleY - BUBBLE_MIN_SPACING;
      result[i] = { ...result[i], bubbleY: Math.min(result[i].bubbleY, ceiling) };
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- y() is a pure function of axisMax, already a dep
  }, [series, axisMax, maxBubbles, bubbleMaxY]);

  return (
    <div className="table-card">
      <div className="flex" ref={revealRef}>
        <div className="overflow-x-auto" ref={scrollerRef} {...dragPan}>
          <svg width={plotWidth} height={CHART_HEIGHT}>
            <line
              x1={0}
              x2={plotWidth}
              y1={y(0)}
              y2={y(0)}
              stroke="var(--baseline)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />

            {drawOrder.map((s, idx) => {
              const lineD = s.cumulative
                .map((value, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(value)}`)
                .join(" ");
              const baseline = y(0);
              const lastPointX = x(s.cumulative.length - 1);
              const areaD = `${lineD} L ${lastPointX} ${baseline} L ${x(0)} ${baseline} Z`;
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

        <svg width={BUBBLE_COL_WIDTH} height={CHART_HEIGHT} className="shrink-0">
          {bubbles.map((b, idx) => {
            const nudged = Math.abs(b.bubbleY - b.lineY) > 0.5;
            const delay = Math.min(idx * REVEAL_STAGGER_MS, REVEAL_STAGGER_CAP_MS) + REVEAL_DURATION_MS;
            return (
              <g
                key={b.id}
                className={"evo-bubble" + (revealed ? " evo-bubble-shown" : "")}
                style={{ transitionDelay: `${delay}ms` }}
              >
                {nudged && (
                  <line
                    x1={2}
                    y1={b.lineY}
                    x2={10}
                    y2={b.bubbleY}
                    stroke="var(--text-muted)"
                    strokeWidth={1}
                    strokeDasharray="1.5 2"
                  />
                )}
                <rect
                  x={10}
                  y={b.bubbleY - BUBBLE_HEIGHT / 2}
                  width={BUBBLE_WIDTH}
                  height={BUBBLE_HEIGHT}
                  rx={BUBBLE_HEIGHT / 2}
                  fill={b.color}
                  fillOpacity={BUBBLE_FILL_OPACITY}
                />
                <circle cx={22} cy={b.bubbleY} r={3.5} fill={b.color} />
                <text
                  x={31}
                  y={b.bubbleY}
                  dy="0.32em"
                  fontSize={11}
                  fontWeight={700}
                  fill="var(--text-secondary)"
                >
                  {b.code}
                </text>
                <text
                  x={92}
                  y={b.bubbleY}
                  dy="0.32em"
                  textAnchor="end"
                  fontSize={11}
                  fontWeight={700}
                  fill="var(--text-primary)"
                >
                  {b.value}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <Tooltip tooltip={tooltip} />
    </div>
  );
}
