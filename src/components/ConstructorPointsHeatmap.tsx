"use client";

import { useEffect, useRef, useState } from "react";
import type { ConstructorPointsGrid, ConstructorPointsCell } from "@/lib/constructor-points-grid";
import { RoundHeader, Tooltip, useTooltip } from "./PointsHeatmap";

function Cell({
  cell,
  max,
  constructorName,
  onEnter,
  onLeave,
}: {
  cell: ConstructorPointsCell | null;
  max: number;
  constructorName: string;
  onEnter: (e: React.MouseEvent<HTMLElement>, content: React.ReactNode) => void;
  onLeave: () => void;
}) {
  if (cell === null) {
    return <td className="w-11 h-9" />;
  }

  const t = max > 0 ? cell.points / max : 0;
  // Reserve bucket 0 for an actual zero score — see PointsHeatmap.tsx.
  const bucket = cell.points > 0 ? Math.max(1, Math.round(t * 6)) : 0;
  const style = {
    background: `var(--heat-${bucket})`,
    color: bucket >= 4 ? "var(--heat-fg-hi)" : "var(--heat-fg-lo)",
  } as React.CSSProperties;

  const content = (
    <>
      <div className="heatmap-tooltip-title">{constructorName}</div>
      <div className="heatmap-tooltip-row">
        <span>Team points</span>
        <b>{cell.points}</b>
      </div>
    </>
  );

  return (
    <td
      className="heat-cell w-11 h-9 text-center text-xs font-medium tabular-nums"
      style={style}
      onMouseEnter={(e) => onEnter(e, content)}
      onMouseLeave={onLeave}
    >
      {cell.points}
    </td>
  );
}

export default function ConstructorPointsHeatmap({ grid }: { grid: ConstructorPointsGrid }) {
  const { tooltip, show, hide } = useTooltip();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);

  function updateScrollWidth() {
    const el = scrollerRef.current;
    if (el) setScrollWidth(el.scrollWidth);
  }

  function syncFromMain() {
    if (scrollerRef.current && topScrollRef.current) {
      topScrollRef.current.scrollLeft = scrollerRef.current.scrollLeft;
    }
  }

  function syncFromTop() {
    if (scrollerRef.current && topScrollRef.current) {
      scrollerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  }

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth - el.clientWidth;
    updateScrollWidth();

    const onResize = () => updateScrollWidth();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [grid]);

  // The top scrollbar's spacer only grows to its full width once the
  // scrollWidth state above has applied and re-rendered — syncing its
  // scrollLeft any earlier clamps to 0, since the spacer isn't wide
  // enough to scroll yet.
  useEffect(() => {
    if (scrollerRef.current && topScrollRef.current) {
      topScrollRef.current.scrollLeft = scrollerRef.current.scrollLeft;
    }
  }, [scrollWidth]);

  return (
    <div className="table-card">
      <div className="top-scrollbar" ref={topScrollRef} onScroll={syncFromTop} aria-hidden="true">
        <div style={{ width: scrollWidth }} />
      </div>
      <div className="overflow-x-auto" ref={scrollerRef} onScroll={syncFromMain}>
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[84px] sm:min-w-[180px] px-2 sm:px-3 py-2 text-left text-xs font-semibold" />
              {grid.columns.map((col) => (
                <RoundHeader
                  key={col.round}
                  round={col.round}
                  abbreviation={col.abbreviation}
                  raceName={col.raceName}
                  flagIso={col.flagIso}
                  date={col.date}
                  hasSprint={col.hasSprint}
                  onEnter={show}
                  onLeave={hide}
                />
              ))}
              <th className="sticky right-0 z-10 min-w-[64px] sm:min-w-[160px] px-2 sm:px-3 py-2 text-center text-xs font-semibold" />
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row) => {
              const barPct = Math.max(2, (row.seasonPoints / grid.maxSeasonPoints) * 100);
              return (
                <tr key={row.constructorId}>
                  <td className="sticky left-0 z-10 px-2 sm:px-3 py-1.5 text-xs">
                    <div className="constructor-cell">
                      <span
                        className="driver-cell-position tabular-nums"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {row.position}
                      </span>
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: row.color }}
                      />
                      <span
                        className="driver-cell-team truncate font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {row.name}
                      </span>
                    </div>
                  </td>
                  {row.pointsByRound.map((cell, idx) => (
                    <Cell
                      key={grid.columns[idx].round}
                      cell={cell}
                      max={grid.maxRoundPoints}
                      constructorName={row.name}
                      onEnter={show}
                      onLeave={hide}
                    />
                  ))}
                  <td className="sticky right-0 z-10 px-2 sm:px-3 py-1.5">
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                      <div className="meter-track relative hidden h-3 w-24 shrink-0 overflow-hidden sm:block">
                        <div
                          className="absolute inset-y-0 left-0"
                          style={{ width: `${barPct}%`, background: row.color }}
                        />
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
      <Tooltip tooltip={tooltip} />
    </div>
  );
}
