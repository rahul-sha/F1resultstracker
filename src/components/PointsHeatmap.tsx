"use client";

import { useEffect, useRef, useState } from "react";
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

type TooltipState = { x: number; y: number; content: React.ReactNode } | null;

// A single tooltip, positioned in the viewport (not inside the scrollable
// table), so it never gets clipped by the table's horizontal scroll area —
// a pure-CSS hover tooltip anchored to the cell does, right at the table's
// own left/right edges.
function useTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  function show(e: React.MouseEvent<HTMLElement>, content: React.ReactNode) {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ x: rect.left + rect.width / 2, y: rect.top, content });
  }
  function hide() {
    setTooltip(null);
  }

  return { tooltip, show, hide };
}

function Tooltip({ tooltip }: { tooltip: TooltipState }) {
  if (!tooltip) return null;
  const clampedX = Math.min(Math.max(tooltip.x, 110), window.innerWidth - 110);
  return (
    <div
      className="heatmap-tooltip"
      role="tooltip"
      style={{ left: clampedX, top: tooltip.y - 10 }}
    >
      {tooltip.content}
    </div>
  );
}

function RoundHeader({
  round,
  abbreviation,
  raceName,
  flagIso,
  date,
  hasSprint,
  onEnter,
  onLeave,
}: {
  round: number;
  abbreviation: string;
  raceName: string;
  flagIso: string | null;
  date: string;
  hasSprint: boolean;
  onEnter: (e: React.MouseEvent<HTMLElement>, content: React.ReactNode) => void;
  onLeave: () => void;
}) {
  const content = (
    <>
      <div className="heatmap-tooltip-title">
        Round {round} &middot; {raceName}
      </div>
      <div className="heatmap-tooltip-row">
        <span>Date</span>
        <b>{formatRaceDate(date)}</b>
      </div>
      {hasSprint ? (
        <div className="heatmap-tooltip-row">
          <span>Format</span>
          <b>Sprint weekend</b>
        </div>
      ) : null}
    </>
  );

  return (
    <th
      className="round-header px-1 py-2 text-center text-[11px] font-semibold"
      style={{ color: "var(--text-secondary)" }}
    >
      <div
        className={"round-chip" + (hasSprint ? " round-chip-sprint" : "")}
        onMouseEnter={(e) => onEnter(e, content)}
        onMouseLeave={onLeave}
      >
        {flagIso ? <span className={`fi fi-${flagIso} round-flag`} aria-hidden="true" /> : null}
        <span>{abbreviation}</span>
      </div>
    </th>
  );
}

type HeatmapMode = "points" | "position";

const DNF_CODES = new Set(["R", "W", "D", "E", "N"]);

function PointsCellContent({
  cell,
  max,
  driverName,
  constructorName,
  hasSprint,
  onEnter,
  onLeave,
}: {
  cell: PointsCell;
  max: number;
  driverName: string;
  constructorName: string;
  hasSprint: boolean;
  onEnter: (e: React.MouseEvent<HTMLElement>, content: React.ReactNode) => void;
  onLeave: () => void;
}) {
  // Bucket into the active theme's 7-stop --heat-0..--heat-6 ramp (defined
  // per accent palette in globals.css) rather than a fixed hardcoded ramp,
  // so the heatmap re-colors itself when the palette changes.
  const t = max > 0 ? cell.points / max : 0;
  const bucket = Math.round(t * 6);
  const style = {
    background: `var(--heat-${bucket})`,
    color: bucket >= 4 ? "var(--heat-fg-hi)" : "var(--heat-fg-lo)",
  } as React.CSSProperties;

  const content = (
    <>
      <div className="heatmap-tooltip-title">
        {driverName} ({constructorName})
      </div>
      {cell.position ? (
        <div className="heatmap-tooltip-row">
          <span>Position</span>
          <b>{cell.position}</b>
        </div>
      ) : null}
      {cell.status ? (
        <div className="heatmap-tooltip-row">
          <span>Status</span>
          <b>{cell.status}</b>
        </div>
      ) : null}
      <div className="heatmap-tooltip-row">
        <span>Race points</span>
        <b>{cell.racePoints}</b>
      </div>
      {hasSprint ? (
        <div className="heatmap-tooltip-row">
          <span>Sprint points</span>
          <b>{cell.sprintPoints ?? 0}</b>
        </div>
      ) : null}
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

function PositionCellContent({
  cell,
  maxPosition,
  driverName,
  constructorName,
  hasSprint,
  onEnter,
  onLeave,
}: {
  cell: PointsCell;
  maxPosition: number;
  driverName: string;
  constructorName: string;
  hasSprint: boolean;
  onEnter: (e: React.MouseEvent<HTMLElement>, content: React.ReactNode) => void;
  onLeave: () => void;
}) {
  const isDnf = cell.position !== null && DNF_CODES.has(cell.position);

  const content = (
    <>
      <div className="heatmap-tooltip-title">
        {driverName} ({constructorName})
      </div>
      {cell.status ? (
        <div className="heatmap-tooltip-row">
          <span>Status</span>
          <b>{cell.status}</b>
        </div>
      ) : null}
      {hasSprint ? (
        <div className="heatmap-tooltip-row">
          <span>Sprint</span>
          <b>{cell.sprintPosition ?? "—"}</b>
        </div>
      ) : null}
    </>
  );

  if (isDnf) {
    return (
      <td
        className="heat-cell w-11 h-9 text-center text-xs font-medium tabular-nums"
        onMouseEnter={(e) => onEnter(e, content)}
        onMouseLeave={onLeave}
      >
        <span className="pos-dnf">
          {cell.position}
          {cell.sprintPosition ? <sup>{cell.sprintPosition}</sup> : null}
        </span>
      </td>
    );
  }

  // Lower finishing position is a stronger result, so the ramp runs in
  // reverse from the points heatmap: 1st place gets the deepest shade.
  // A straight linear spread across the whole field (1..maxPosition)
  // crowds 1st/2nd/3rd into the same top bucket once there are 20+ cars,
  // since there are only 7 shades to go around — so the top finishers each
  // get their own shade and everything from 8th back shares the lightest
  // one, rather than every position getting an equal, and mostly invisible,
  // slice of the ramp.
  const classified = cell.classifiedPosition ?? maxPosition;
  const bucket = Math.max(0, Math.min(6, 7 - classified));
  const style = {
    background: `var(--heat-${bucket})`,
    color: bucket >= 4 ? "var(--heat-fg-hi)" : "var(--heat-fg-lo)",
  } as React.CSSProperties;

  return (
    <td
      className="heat-cell w-11 h-9 text-center text-xs font-medium tabular-nums"
      style={style}
      onMouseEnter={(e) => onEnter(e, content)}
      onMouseLeave={onLeave}
    >
      {cell.position}
      {cell.sprintPosition ? <sup>{cell.sprintPosition}</sup> : null}
    </td>
  );
}

function Cell({
  cell,
  mode,
  max,
  maxPosition,
  driverName,
  constructorName,
  hasSprint,
  onEnter,
  onLeave,
}: {
  cell: PointsCell | null;
  mode: HeatmapMode;
  max: number;
  maxPosition: number;
  driverName: string;
  constructorName: string;
  hasSprint: boolean;
  onEnter: (e: React.MouseEvent<HTMLElement>, content: React.ReactNode) => void;
  onLeave: () => void;
}) {
  if (cell === null) {
    return <td className="w-11 h-9" />;
  }
  if (mode === "position") {
    return (
      <PositionCellContent
        cell={cell}
        maxPosition={maxPosition}
        driverName={driverName}
        constructorName={constructorName}
        hasSprint={hasSprint}
        onEnter={onEnter}
        onLeave={onLeave}
      />
    );
  }
  return (
    <PointsCellContent
      cell={cell}
      max={max}
      driverName={driverName}
      constructorName={constructorName}
      hasSprint={hasSprint}
      onEnter={onEnter}
      onLeave={onLeave}
    />
  );
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export default function PointsHeatmap({
  grid,
  mode = "points",
}: {
  grid: PointsGrid;
  mode?: HeatmapMode;
}) {
  const { tooltip, show, hide } = useTooltip();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollHints() {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // Land on the most recent race by default rather than the first round —
    // on a narrow screen that's scrolled furthest from view, and it's the
    // one people care about most. A no-op when everything already fits.
    el.scrollLeft = el.scrollWidth - el.clientWidth;
    updateScrollHints();

    const onResize = () => updateScrollHints();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [grid]);

  return (
    <div className="table-card">
      {canScrollLeft ? (
        <div className="scroll-hint scroll-hint-left" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ) : null}
      {canScrollRight ? (
        <div className="scroll-hint scroll-hint-right" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ) : null}
      <div className="overflow-x-auto" ref={scrollerRef} onScroll={updateScrollHints}>
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
            const medianFinish =
              mode === "position"
                ? median(
                    row.pointsByRound
                      .filter((c): c is PointsCell => c !== null && c.classifiedPosition !== null)
                      .map((c) => c.classifiedPosition as number)
                  )
                : null;
            const medianBarPct =
              medianFinish !== null
                ? Math.max(2, ((grid.maxClassifiedPosition - medianFinish + 1) / grid.maxClassifiedPosition) * 100)
                : 0;

            return (
              <tr key={row.driverId}>
                <td className="sticky left-0 z-10 px-2 sm:px-3 py-1.5 text-xs">
                  <div className="driver-cell">
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
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {row.code}
                    </span>
                    <span
                      className="driver-cell-team hidden truncate sm:inline"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {row.constructorName}
                    </span>
                  </div>
                </td>
                {row.pointsByRound.map((cell, idx) => (
                  <Cell
                    key={grid.columns[idx].round}
                    cell={cell}
                    mode={mode}
                    max={grid.maxRoundPoints}
                    maxPosition={grid.maxClassifiedPosition}
                    driverName={row.name}
                    constructorName={row.constructorName}
                    hasSprint={grid.columns[idx].hasSprint}
                    onEnter={show}
                    onLeave={hide}
                  />
                ))}
                <td className="sticky right-0 z-10 px-2 sm:px-3 py-1.5">
                  {mode === "position" ? (
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                      <div className="meter-track relative hidden h-3 w-16 shrink-0 overflow-hidden sm:block">
                        <div
                          className="absolute inset-y-0 left-0"
                          style={{ width: `${medianBarPct}%`, background: row.color }}
                        />
                      </div>
                      <span
                        className="text-xs font-semibold tabular-nums"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {medianFinish !== null ? Math.round(medianFinish) : "—"}
                      </span>
                    </div>
                  ) : (
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
                  )}
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
