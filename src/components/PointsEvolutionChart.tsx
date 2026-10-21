"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import type { PointsGridColumn } from "@/lib/points-grid";
import { useTooltip, useDragPan, Tooltip } from "./PointsHeatmap";

export interface EvolutionSeriesInput {
  id: string;
  label: string;
  code: string;
  color: string;
  pointsByRound: (number | null)[];
}

const ROUND_WIDTH = 36;
const PAD_LEFT = 20;
const PAD_TOP = 14;
const PAD_BOTTOM = 14;
const FLAG_ROW_HEIGHT = 24;
const AREA_OPACITY = 0.14;

// The scroll-triggered reveal is a single wipe (a clip-path rect growing
// left to right) that every driver/team shares, rather than each line
// animating on its own — so it reads as one chart being plotted race by
// race, not several lines fading in out of sync. Scales gently with the
// season length so a long season doesn't feel rushed.
function sweepDurationMs(roundCount: number) {
  return Math.min(6000, Math.max(3000, roundCount * 170));
}

// The end-of-line totals column, outside the horizontal scroller so it
// keeps showing the latest standings even when the plot itself is
// scrolled back to an earlier round. Every series gets a row — the chart
// grows tall enough to fit all of them (see chartHeight below) rather
// than cropping the field to whatever a fixed height could show.
const BUBBLE_COL_WIDTH = 104;
const BUBBLE_WIDTH = 92;
const BUBBLE_HEIGHT = 22;
const BUBBLE_FILL_OPACITY = 0.16;
const BUBBLE_ROW_SPACING = 26;
const MIN_CHART_HEIGHT = 160;

function computeAxisMax(maxValue: number): number {
  // Headroom only — there's no numeric y-axis to round a "nice number" to.
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
  const clipId = `evo-clip-${useId().replace(/:/g, "")}`;
  const duration = sweepDurationMs(columns.length);

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

  // Tall enough for every series to get its own, clearly separate bubble
  // row — the whole field, not just whoever fits a fixed height.
  const chartHeight = Math.max(
    MIN_CHART_HEIGHT,
    PAD_TOP + PAD_BOTTOM + BUBBLE_HEIGHT + Math.max(0, series.length - 1) * BUBBLE_ROW_SPACING
  );
  const plotHeight = chartHeight - PAD_TOP - PAD_BOTTOM;
  const plotWidth = Math.max(1, columns.length - 1) * ROUND_WIDTH + PAD_LEFT;

  const x = (roundIndex: number) => PAD_LEFT / 2 + roundIndex * ROUND_WIDTH;
  const y = (value: number) => PAD_TOP + plotHeight - (value / axisMax) * plotHeight;

  // Draw the strongest season so far on top, so a tight leading battle
  // doesn't get visually buried under the midfield lines beneath it.
  const drawOrder = [...series].sort(
    (a, b) => (a.cumulative[a.cumulative.length - 1] ?? 0) - (b.cumulative[b.cumulative.length - 1] ?? 0)
  );

  // End-of-line totals, one evenly-spaced row per series ranked by value —
  // every driver/team gets a bubble, with a dotted leader line back to
  // where its line actually ends whenever rank order and value spacing
  // don't line up exactly (common once the field is bunched together).
  const bubbleTopY = PAD_TOP + BUBBLE_HEIGHT / 2;
  const bubbles = useMemo(() => {
    const byValueDesc = [...series].sort(
      (a, b) => (b.cumulative[b.cumulative.length - 1] ?? 0) - (a.cumulative[a.cumulative.length - 1] ?? 0)
    );
    return byValueDesc.map((s, idx) => {
      const value = s.cumulative[s.cumulative.length - 1] ?? 0;
      return {
        id: s.id,
        code: s.code,
        color: s.color,
        value,
        lineY: y(value),
        bubbleY: bubbleTopY + idx * BUBBLE_ROW_SPACING,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- y() is a pure function of axisMax/chartHeight, already deps
  }, [series, axisMax, chartHeight, bubbleTopY]);

  return (
    <div className="table-card">
      <div className="flex" ref={revealRef}>
        <div className="overflow-x-auto min-w-0 flex-1" ref={scrollerRef} {...dragPan}>
          <svg width={plotWidth} height={chartHeight}>
            <defs>
              <clipPath id={clipId}>
                <rect
                  x={0}
                  y={-20}
                  width={plotWidth}
                  height={chartHeight + 40}
                  className={"evo-sweep-rect" + (revealed ? " evo-sweep-rect-shown" : "")}
                  style={
                    {
                      "--evo-sweep-width": `${plotWidth}px`,
                      transitionDuration: `${duration}ms`,
                    } as CSSProperties
                  }
                />
              </clipPath>
            </defs>

            <line
              x1={0}
              x2={plotWidth}
              y1={y(0)}
              y2={y(0)}
              stroke="var(--baseline)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />

            {/* Everything below is revealed together by one left-to-right
                wipe, so the whole chart reads as being plotted race by
                race rather than several lines animating independently. */}
            <g clipPath={`url(#${clipId})`}>
              {drawOrder.map((s) => {
                const lineD = s.cumulative
                  .map((value, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(value)}`)
                  .join(" ");
                const baseline = y(0);
                const lastPointX = x(s.cumulative.length - 1);
                const areaD = `${lineD} L ${lastPointX} ${baseline} L ${x(0)} ${baseline} Z`;
                return (
                  <g key={s.id}>
                    {/* Material 3 tonal fill — a soft wash of the line's own
                        colour under it, the same "tonal container" idea used
                        for surfaces elsewhere in the app, not just a bare
                        stroke on a blank plot. */}
                    <path d={areaD} fill={s.color} fillOpacity={AREA_OPACITY} stroke="none" />
                    <path
                      d={lineD}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={3}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}

              {drawOrder.map((s) =>
                s.cumulative.map((value, i) => (
                  <circle
                    key={`${s.id}-${i}-dot`}
                    cx={x(i)}
                    cy={y(value)}
                    r={i === s.cumulative.length - 1 ? 4.5 : 2.5}
                    fill={s.color}
                  />
                ))
              )}
            </g>

            {/* The moving leading edge of the wipe — a brief visual cue
                that the line is being drawn, not just appearing. */}
            <line
              x1={0}
              x2={0}
              y1={-10}
              y2={chartHeight + 10}
              stroke="var(--text-primary)"
              strokeOpacity={0.3}
              strokeWidth={2}
              className={"evo-sweep-edge" + (revealed ? " evo-sweep-edge-shown" : "")}
              style={
                {
                  "--evo-sweep-width": `${plotWidth}px`,
                  transitionDuration: `${duration}ms`,
                } as CSSProperties
              }
            />

            {drawOrder.map((s) =>
              s.cumulative.map((value, i) => (
                <circle
                  key={`${s.id}-${i}-hit`}
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

        <svg width={BUBBLE_COL_WIDTH} height={chartHeight} className="shrink-0">
          {bubbles.map((b, idx) => {
            const nudged = Math.abs(b.bubbleY - b.lineY) > 0.5;
            const delay = duration + Math.min(idx * 20, 400);
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
