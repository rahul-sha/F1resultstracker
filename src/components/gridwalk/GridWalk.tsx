"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./gridwalk.css";
import { createLiveGrid } from "./liveGrid";
import SeasonSelector from "@/components/SeasonSelector";
import ThemeToggle from "@/components/ThemeToggle";
import AccentToggle from "@/components/AccentToggle";
import type { PointsGrid } from "@/lib/points-grid";
import type { ConstructorPointsGrid } from "@/lib/constructor-points-grid";
import type { FinishPositionSummary } from "@/lib/finish-positions";
import type { QualifyingPositionSummary } from "@/lib/qualifying-positions";
import PointsHeatmap from "@/components/PointsHeatmap";
import ConstructorPointsHeatmap from "@/components/ConstructorPointsHeatmap";
import DriverPointsEvolutionChart from "@/components/DriverPointsEvolutionChart";
import FinishPositionsGrid from "@/components/FinishPositionsGrid";
import QualifyingPositionsGrid from "@/components/QualifyingPositionsGrid";
import PodiumBars from "@/components/PodiumBars";

export interface GridWalkProps {
  season: number;
  pointsGrid: PointsGrid;
  constructorGrid: ConstructorPointsGrid;
  finishSummary: FinishPositionSummary;
  qualifyingSummary: QualifyingPositionSummary;
}

type SectionDef = {
  id: string;
  title: string;
  subtitle: string;
  render: () => React.ReactNode;
};

type View = { k: number; tx: number; ty: number };
type SlotGeom = { s: number; c: number };

const GAP = 40;
const EASE = 0.16;
const MIN_K = 0.6;
const MAX_K = 5;
const DRAG_THRESHOLD = 6;

// Grid Walk: the eight season graphics on one horizontal strip. One flat
// camera — translate(tx, ty) scale(k) on .gw-strip — handles browsing
// (tx), zoom (k, around the pointer) and panning while zoomed (tx, ty).
// At k=1 the strip always settles with one card centred; each card is
// fitted to the space between the top bar and the jump bar, never
// enlarged past its natural size. See "grid-walk-carousel-mockup" memory.
export default function GridWalk({
  season,
  pointsGrid,
  constructorGrid,
  finishSummary,
  qualifyingSummary,
}: GridWalkProps) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const pillsRef = useRef<HTMLDivElement>(null);
  const zoomLevelRef = useRef<HTMLSpanElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const geom = useRef<SlotGeom[]>([]);
  const metrics = useRef({ W: 0, TOP: 0, availH: 0 });
  const view = useRef<View>({ k: 1, tx: 0, ty: 0 });
  const target = useRef<View | null>(null);
  const focusRef = useRef(0);
  const moved = useRef(false);

  const [focus, setFocus] = useState(0);
  const [hintGone, setHintGone] = useState(false);

  const sections: SectionDef[] = [
    {
      id: "results",
      title: "Results",
      subtitle: "Points scored by each driver per Grand Prix.",
      render: () => <PointsHeatmap grid={pointsGrid} />,
    },
    {
      id: "constructors",
      title: "Constructors",
      subtitle: "Points scored by each team per Grand Prix.",
      render: () => <ConstructorPointsHeatmap grid={constructorGrid} />,
    },
    {
      id: "evolution",
      title: "Driver Points Evolution",
      subtitle: "Cumulative points scored by each driver across the season.",
      render: () => <DriverPointsEvolutionChart grid={pointsGrid} />,
    },
    {
      id: "positions",
      title: "Positions",
      subtitle: "Where each driver finished in every Grand Prix.",
      render: () => <PointsHeatmap grid={pointsGrid} mode="position" />,
    },
    {
      id: "finishfreq",
      title: "Finish Frequency",
      subtitle: "How often each driver has finished in each position.",
      render: () => <FinishPositionsGrid summary={finishSummary} />,
    },
    {
      id: "qualifreq",
      title: "Qualifying Frequency",
      subtitle: "How often each driver has qualified in each grid position.",
      render: () => <QualifyingPositionsGrid summary={qualifyingSummary} />,
    },
    {
      id: "podiumsD",
      title: "Driver Podiums",
      subtitle: "1st/2nd/3rd place finishes per driver.",
      render: () => (
        <PodiumBars
          drivers={finishSummary.driverPodiums.map((d) => ({
            label: d.code,
            team: d.constructorName,
            color: d.color,
            podiums: d.podiums,
          }))}
          teams={[]}
        />
      ),
    },
    {
      id: "podiumsT",
      title: "Constructor Podiums",
      subtitle: "1st/2nd/3rd place finishes per team.",
      render: () => (
        <PodiumBars
          drivers={[]}
          teams={finishSummary.teamPodiums.map((t) => ({
            label: t.constructorName,
            color: t.color,
            podiums: t.podiums,
          }))}
        />
      ),
    },
  ];
  const count = sections.length;

  function txFor(i: number, k: number) {
    return metrics.current.W / 2 - k * geom.current[i].c;
  }

  function nearestTo(stripX: number) {
    let best = 0;
    let bestDist = Infinity;
    geom.current.forEach((g, i) => {
      const d = Math.abs(g.c - stripX);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  // Measures each card's natural size and writes every slot's position and
  // fitted scale straight to the DOM (no state: it's re-run on resize and
  // after every render, and React never sets these styles itself).
  function layout() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const phone = W <= 640;
    const TOP = phone ? 84 : 92;
    const BOTTOM = phone ? 92 : 100;
    const availH = Math.max(160, H - TOP - BOTTOM);
    const availW = W - (phone ? 48 : 180);
    metrics.current = { W, TOP, availH };
    let x = 0;
    geom.current = sections.map((_, i) => {
      const card = cardRefs.current[i];
      const slot = slotRefs.current[i];
      if (!card || !slot) return { s: 1, c: x };
      const nw = card.offsetWidth;
      const nh = card.offsetHeight;
      const s = Math.min(1, availH / nh, availW / nw);
      const w = nw * s;
      const h = nh * s;
      card.style.transform = `scale(${s})`;
      slot.style.left = `${x}px`;
      slot.style.top = `${(availH - h) / 2}px`;
      slot.style.width = `${w}px`;
      slot.style.height = `${h}px`;
      const g = { s, c: x + w / 2 };
      x += w + GAP;
      return g;
    });
  }

  function apply() {
    const strip = stripRef.current;
    if (!strip) return;
    const { k, tx, ty } = view.current;
    strip.style.transform = `translate(${tx.toFixed(1)}px, ${(metrics.current.TOP + ty).toFixed(1)}px) scale(${k.toFixed(4)})`;
    const f = nearestTo((metrics.current.W / 2 - tx) / k);
    if (f !== focusRef.current) {
      focusRef.current = f;
      setFocus(f);
    }
    wrapRef.current?.classList.toggle("zoomed", k > 1.02);
    if (zoomLevelRef.current) {
      zoomLevelRef.current.textContent =
        Math.abs(k - 1) < 0.02 ? "Fit" : `${Math.round(k * (geom.current[f]?.s ?? 1) * 100)}%`;
    }
  }

  function goTo(i: number, resetZoom = true) {
    const idx = Math.max(0, Math.min(count - 1, i));
    const k = resetZoom ? 1 : view.current.k;
    target.current = { k, tx: txFor(idx, k), ty: resetZoom ? 0 : view.current.ty };
  }

  // Zooms by `factor` keeping the screen point (px, py) fixed — the
  // standard map/canvas zoom.
  function zoomAt(px: number, py: number, factor: number) {
    target.current = null;
    const v = view.current;
    const k = Math.max(MIN_K, Math.min(MAX_K, v.k * factor));
    const f = k / v.k;
    const ly = py - metrics.current.TOP;
    view.current = { k, tx: px - (px - v.tx) * f, ty: ly - (ly - v.ty) * f };
    apply();
  }

  function zoomCentre(factor: number) {
    const { W, TOP, availH } = metrics.current;
    zoomAt(W / 2, TOP + availH / 2, factor);
  }

  function dismissHint() {
    setHintGone(true);
  }

  // Clicking a side card brings it to the centre; clicking the centred
  // card toggles between "fit" and its full natural size (at least 1.8x),
  // zooming around the click point.
  function onCardClick(i: number, e: React.MouseEvent) {
    if (moved.current) return;
    dismissHint();
    if (i !== focusRef.current || view.current.k > 1.02) {
      goTo(i);
      return;
    }
    const v = view.current;
    const k = Math.min(MAX_K, Math.max(1.8, 1 / geom.current[i].s));
    const f = k / v.k;
    const ly = e.clientY - metrics.current.TOP;
    target.current = { k, tx: e.clientX - (e.clientX - v.tx) * f, ty: ly - (ly - v.ty) * f };
  }

  // Re-measure after every commit (a season switch changes card sizes);
  // at fit zoom, keep the focused card centred.
  useLayoutEffect(() => {
    layout();
    if (Math.abs(view.current.k - 1) < 0.02 && !target.current) {
      view.current = { k: 1, tx: txFor(focusRef.current, 1), ty: 0 };
    }
    apply();
    stripRef.current?.classList.remove("pending");
  });

  // Keeps the active pill in view in the jump bar's own scroller (not
  // scrollIntoView, which can also nudge the page).
  useEffect(() => {
    const bar = pillsRef.current;
    const pill = bar?.children[focus] as HTMLElement | undefined;
    if (!bar || !pill) return;
    const left = pill.offsetLeft - bar.clientWidth / 2 + pill.offsetWidth / 2;
    bar.scrollTo({ left, behavior: "smooth" });
  }, [focus]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let pinch: { d: number; mx: number; my: number } | null = null;
    let dragging = false;
    let downX = 0;
    let lastX = 0;
    let lastY = 0;
    let vx = 0;
    let vy = 0;
    let startFocus = 0;
    let coast: { vx: number; vy: number } | null = null;
    let settleTimer = 0;

    // After a wheel swipe or zoom ends near fit, glide onto the nearest card.
    function scheduleSettle() {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        if (dragging || pointers.size) return;
        if (view.current.k < 1.06) goTo(focusRef.current);
      }, 160);
    }

    function pinchState() {
      const [a, b] = [...pointers.values()];
      return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    }

    function onPointerDown(e: PointerEvent) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        dragging = false;
        moved.current = true;
        wrap!.classList.remove("dragging");
        pinch = pinchState();
        return;
      }
      if (pointers.size > 2) return;
      dragging = true;
      moved.current = false;
      target.current = null;
      coast = null;
      vx = vy = 0;
      downX = lastX = e.clientX;
      lastY = e.clientY;
      startFocus = focusRef.current;
      wrap!.classList.add("dragging");
      // No setPointerCapture: it would retarget the click to wrap, so a
      // card's own onClick would never fire.
    }

    function onPointerMove(e: PointerEvent) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const next = pinchState();
        view.current.tx += next.mx - pinch.mx;
        view.current.ty += next.my - pinch.my;
        if (pinch.d > 0) zoomAt(next.mx, next.my, next.d / pinch.d);
        pinch = next;
        return;
      }
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (Math.abs(e.clientX - downX) > DRAG_THRESHOLD) {
        moved.current = true;
        setHintGone(true);
      }
      const zoomed = view.current.k > 1.02;
      view.current.tx += dx;
      if (zoomed) view.current.ty += dy;
      vx = dx;
      vy = zoomed ? dy : 0;
      apply();
    }

    function onPointerUp(e: PointerEvent) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size > 0) return;
      if (!dragging) {
        scheduleSettle();
        return;
      }
      dragging = false;
      wrap!.classList.remove("dragging");
      if (!moved.current) return;
      if (view.current.k <= 1.06) {
        // Flick-aware snap, but one swipe moves one card at most.
        let best = nearestTo((metrics.current.W / 2 - (view.current.tx + vx * 10)) / view.current.k);
        if (best === startFocus && Math.abs(vx) > 6) best += vx < 0 ? 1 : -1;
        goTo(Math.max(startFocus - 1, Math.min(startFocus + 1, best)));
      } else {
        coast = { vx, vy };
      }
    }

    // Vertical wheel zooms (the ask was "zoom via scroll"); a sideways
    // trackpad swipe or shift+wheel browses the strip instead. Trackpad
    // pinch arrives as ctrl+wheel with small deltas, hence its higher rate.
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      setHintGone(true);
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      let dx = e.deltaX * unit;
      let dy = e.deltaY * unit;
      if (e.shiftKey && !dx) {
        dx = dy;
        dy = 0;
      }
      if (!e.ctrlKey && Math.abs(dx) > Math.abs(dy)) {
        target.current = null;
        view.current.tx -= dx;
        apply();
      } else {
        zoomAt(e.clientX, e.clientY, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0012)));
      }
      scheduleSettle();
    }

    // Safari's trackpad pinch sends gesture events instead of ctrl+wheel.
    let lastGestureScale = 1;
    type GestureLike = Event & { scale: number; clientX: number; clientY: number };
    function onGestureStart(e: Event) {
      e.preventDefault();
      lastGestureScale = 1;
    }
    function onGestureChange(e: Event) {
      e.preventDefault();
      const g = e as GestureLike;
      zoomAt(g.clientX, g.clientY, g.scale / lastGestureScale);
      lastGestureScale = g.scale;
    }
    function onGestureEnd(e: Event) {
      e.preventDefault();
      scheduleSettle();
    }

    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "ArrowRight") goTo(focusRef.current + 1);
      else if (e.key === "ArrowLeft") goTo(focusRef.current - 1);
      else if (e.key === "+" || e.key === "=") zoomCentre(1.25);
      else if (e.key === "-") zoomCentre(0.8);
      else if (e.key === "0" || e.key === "Escape") goTo(focusRef.current);
      else return;
      setHintGone(true);
    }

    function onResize() {
      layout();
      target.current = null;
      view.current = { k: 1, tx: txFor(focusRef.current, 1), ty: 0 };
      apply();
    }

    wrap.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    wrap.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("gesturestart", onGestureStart);
    wrap.addEventListener("gesturechange", onGestureChange);
    wrap.addEventListener("gestureend", onGestureEnd);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);

    const grid = gridRef.current ? createLiveGrid(gridRef.current) : null;

    let raf = 0;
    function tick(now: number) {
      grid?.draw(now, view.current);
      const t = target.current;
      if (t) {
        const v = view.current;
        const next = {
          k: v.k + (t.k - v.k) * EASE,
          tx: v.tx + (t.tx - v.tx) * EASE,
          ty: v.ty + (t.ty - v.ty) * EASE,
        };
        if (Math.abs(t.k - next.k) < 0.002 && Math.abs(t.tx - next.tx) < 0.5 && Math.abs(t.ty - next.ty) < 0.5) {
          view.current = { ...t };
          target.current = null;
        } else {
          view.current = next;
        }
        apply();
      } else if (coast && !dragging) {
        view.current.tx += coast.vx;
        view.current.ty += coast.vy;
        coast.vx *= 0.92;
        coast.vy *= 0.92;
        if (Math.abs(coast.vx) < 0.2 && Math.abs(coast.vy) < 0.2) coast = null;
        apply();
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      wrap.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("gesturestart", onGestureStart);
      wrap.removeEventListener("gesturechange", onGestureChange);
      wrap.removeEventListener("gestureend", onGestureEnd);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(settleTimer);
      cancelAnimationFrame(raf);
      grid?.destroy();
    };
    // Runs once: everything it reads that changes over time is a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="gw-wrap" ref={wrapRef}>
      <div className="gw-pulse-a" />
      <div className="gw-pulse-b" />
      <canvas className="gw-grid" ref={gridRef} aria-hidden="true" />

      {/* "pending" is removed by the layout effect once every card has been
          measured and placed; React never rewrites this constant className. */}
      <div className="gw-strip pending" ref={stripRef}>
        {sections.map((section, i) => (
          <div
            key={section.id}
            ref={(el) => {
              slotRefs.current[i] = el;
            }}
            className={"gw-slot" + (i === focus ? " focus" : "")}
          >
            <div
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="gw-card"
              role="button"
              tabIndex={0}
              aria-label={`${section.title}: ${section.subtitle}`}
              onClick={(e) => onCardClick(i, e)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goTo(i);
                }
              }}
            >
              <div className="gw-card-inner">
                <div className="section-header">
                  <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                    {section.title}
                  </h2>
                  <p className="text-sm">{section.subtitle}</p>
                </div>
                {section.render()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="gw-topbar">
        <div className="gw-brand">
          <span className="gw-brand-mark" aria-hidden="true">
            <svg width="22" height="14" viewBox="0 0 22 14" fill="currentColor">
              <path d="M0 14L6 0h4L4 14H0z" />
              <path d="M7 14L13 0h4L11 14H7z" />
              <path d="M14 14L20 0h2L16 14h-2z" />
            </svg>
          </span>
          <span className="gw-brand-text">Grid Walk</span>
        </div>
        <div className="gw-topbar-right">
          <button type="button" className="gw-about-link" onClick={() => router.push("/about")}>
            About
          </button>
          <ThemeToggle iconOnly />
          <AccentToggle iconOnly />
          <SeasonSelector initialSeason={season} />
        </div>
      </div>

      <div className={"gw-hint" + (hintGone ? " gone" : "")} aria-hidden="true">
        <span className="gw-hint-wide">
          {season} season · drag or use ← → to browse · scroll or pinch to zoom · click a card for full size
        </span>
        <span className="gw-hint-narrow">Swipe to browse · pinch to zoom · tap for full size</span>
      </div>

      <button
        type="button"
        className="gw-arrow prev"
        aria-label="Previous card"
        disabled={focus === 0}
        onClick={() => {
          goTo(focus - 1);
          dismissHint();
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        type="button"
        className="gw-arrow next"
        aria-label="Next card"
        disabled={focus === count - 1}
        onClick={() => {
          goTo(focus + 1);
          dismissHint();
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      <div className="gw-dots" aria-hidden="true">
        {sections.map((section, i) => (
          <span key={section.id} className={i === focus ? "on" : ""} />
        ))}
      </div>

      <div className="gw-jumpbar">
        <span className="gw-jumpbar-label">Jump to</span>
        <div className="gw-jumpbar-pills" ref={pillsRef}>
          {sections.map((section, i) => (
            <button
              key={section.id}
              type="button"
              className={"gw-jump-pill" + (i === focus ? " active" : "")}
              aria-current={i === focus ? "true" : undefined}
              onClick={() => {
                goTo(i);
                dismissHint();
              }}
            >
              {section.title}
            </button>
          ))}
        </div>
        <div className="gw-zoomctl">
          <button type="button" className="gw-zoom-btn icon" aria-label="Zoom out" onClick={() => zoomCentre(0.8)}>
            −
          </button>
          <span className="gw-zoom-level" ref={zoomLevelRef}>
            Fit
          </span>
          <button type="button" className="gw-zoom-btn icon" aria-label="Zoom in" onClick={() => zoomCentre(1.25)}>
            +
          </button>
          <button type="button" className="gw-zoom-btn" onClick={() => goTo(focusRef.current)}>
            Fit
          </button>
        </div>
      </div>
    </div>
  );
}
