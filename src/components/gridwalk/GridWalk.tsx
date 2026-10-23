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
import ConstructorPointsEvolutionChart from "@/components/ConstructorPointsEvolutionChart";
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
  // The jump tabs/pills need a label that covers a card stacking two
  // halves (e.g. a driver and a team graphic) — falls back to title.
  navLabel?: string;
  // Extra control(s) shown beside the title/subtitle (e.g. a toggle
  // between two graphics sharing the card) — pointer-events are re-enabled
  // for these since .gw-card-inner otherwise disables them.
  headerActions?: () => React.ReactNode;
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
  const tabsRef = useRef<HTMLDivElement>(null);
  // Whether each tab strip's current scroll (desktop top bar, phone bottom
  // bar) was started by code rather than by hand, and the timer that waits
  // for a scroll to come to rest.
  const tabsProgrammatic = useRef(false);
  const pillsProgrammatic = useRef(false);
  // The phone strip is moving by hand: "finger" while touched, "coasting"
  // after release until it comes to rest. Code leaves it alone meanwhile.
  const pillsHeld = useRef<"finger" | "coasting" | null>(null);
  const tabsSettle = useRef(0);
  // Set after a mouse drag of the tab strip, so the release doesn't also
  // count as a click on whichever tab was under the pointer.
  const tabsDragged = useRef(false);
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
  const [freqView, setFreqView] = useState<"finish" | "quali">("finish");

  // Pre-rendered card snapshots: a card's own content (tables/charts/bars)
  // is the single biggest cost to the GPU on every drag frame, far more
  // than the live grid ever was (see "grid-walk-blur-gpu-cost" memory —
  // confirmed from a real device trace). For the current season only, a
  // weekly-regenerated image stands in for that content; every other
  // season still renders live, so nothing here can go stale or missing
  // mid-season. `null` means "not yet known" (SSR has no access to
  // localStorage), so the first paint always renders live and swaps in
  // the image a tick later — never the other way round.
  const [variant, setVariant] = useState<{ accent: string; theme: string } | null>(null);
  useEffect(() => {
    function read() {
      const root = document.documentElement;
      setVariant({
        accent: root.getAttribute("data-accent") || "monokai",
        theme: root.getAttribute("data-theme") || "light",
      });
    }
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-accent"] });
    return () => observer.disconnect();
  }, []);
  // The capture script that GENERATES these snapshot images loads this
  // same page — without this escape hatch it would capture the snapshot
  // <img> it's meant to be replacing, baking any past mistake in forever.
  // Safe to read on the client's first render: `variant` is still null
  // then, so server and client both render live content either way.
  const [forceLive] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("noSnapshot") === "1"
  );
  const snapshotSeason = 2026;
  function snapshotSrc(sectionId: string) {
    if (forceLive || season !== snapshotSeason || !variant) return null;
    const name = sectionId === "freq" ? `freq-${freqView}` : sectionId;
    return `/card-snapshots/${snapshotSeason}/${variant.accent}-${variant.theme}/${name}.png`;
  }
  // Natural (unscaled) CSS-pixel size of each card's rendered content —
  // theme/accent-invariant (only colour changes), measured once from the
  // live content. Keeps layout() measuring the same size whichever way a
  // card is currently rendered, live or snapshot.
  const SNAPSHOT_SIZE: Record<string, { w: number; h: number }> = {
    results: { w: 710, h: 961 },
    evolution: { w: 603, h: 938 },
    positions: { w: 1118, h: 921 },
    "freq-finish": { w: 1264, h: 916 },
    "freq-quali": { w: 1264, h: 916 },
    podiumsD: { w: 658, h: 665 },
  };
  // A snapshot that 404s (not yet generated for this combination) falls
  // back to live rendering rather than showing a broken image.
  const [failedSnapshots, setFailedSnapshots] = useState<Set<string>>(new Set());

  const sections: SectionDef[] = [
    {
      id: "results",
      title: "Drivers Results",
      subtitle: "Points scored by each driver per Grand Prix.",
      navLabel: "Points Finishes",
      render: () => (
        <>
          <PointsHeatmap grid={pointsGrid} />
          <div className="section-header gw-subsection-header">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Team Results
            </h2>
            <p className="text-sm">Points scored by each team per Grand Prix.</p>
          </div>
          <ConstructorPointsHeatmap grid={constructorGrid} />
        </>
      ),
    },
    {
      id: "evolution",
      title: "Driver Points Evolution",
      subtitle: "Cumulative points scored by each driver across the season.",
      render: () => (
        <>
          <DriverPointsEvolutionChart grid={pointsGrid} />
          <div className="section-header gw-subsection-header">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Constructor Points Evolution
            </h2>
            <p className="text-sm">Cumulative points scored by each team across the season.</p>
          </div>
          <ConstructorPointsEvolutionChart grid={constructorGrid} />
        </>
      ),
    },
    {
      id: "positions",
      title: "Positions",
      subtitle: "Where each driver finished in every Grand Prix.",
      render: () => <PointsHeatmap grid={pointsGrid} mode="position" />,
    },
    {
      id: "freq",
      title: freqView === "finish" ? "Finish Frequency" : "Qualifying Frequency",
      subtitle:
        freqView === "finish"
          ? "How often each driver has finished in each position."
          : "How often each driver has qualified in each grid position.",
      headerActions: () => (
        <button
          type="button"
          className="gw-freq-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setFreqView((v) => (v === "finish" ? "quali" : "finish"));
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 5.5h8.5L8 3M14 10.5H5.5L8 13" />
          </svg>
          {freqView === "finish" ? "Qualifying" : "Race"}
        </button>
      ),
      render: () => (
        // Both tables stay mounted and overlap in the same grid cell, so
        // the container is always as tall as the taller one and swapping
        // only ever crossfades — it never collapses to find its new
        // height the way a single remounted view briefly did.
        <div className="gw-freq-stage">
          <div className={"gw-freq-pane" + (freqView === "finish" ? " active" : "")} aria-hidden={freqView !== "finish"}>
            <FinishPositionsGrid summary={finishSummary} />
          </div>
          <div className={"gw-freq-pane" + (freqView === "quali" ? " active" : "")} aria-hidden={freqView !== "quali"}>
            <QualifyingPositionsGrid summary={qualifyingSummary} />
          </div>
        </div>
      ),
    },
    {
      id: "podiumsD",
      title: "Driver Podiums",
      subtitle: "1st/2nd/3rd place finishes per driver.",
      render: () => (
        <>
          <PodiumBars
            drivers={finishSummary.driverPodiums.map((d) => ({
              label: d.code,
              team: d.constructorName,
              color: d.color,
              podiums: d.podiums,
            }))}
            teams={[]}
          />
          <div className="section-header gw-subsection-header">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Constructor Podiums
            </h2>
            <p className="text-sm">1st/2nd/3rd place finishes per team.</p>
          </div>
          <PodiumBars
            drivers={[]}
            teams={finishSummary.teamPodiums.map((t) => ({
              label: t.constructorName,
              color: t.color,
              podiums: t.podiums,
            }))}
          />
        </>
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
  // Every card is the same fixed size (see .gw-card); its content keeps its
  // own proportions and is scaled to fit the frame below the header,
  // centred, with space left around it rather than cropped.
  function fitContent(card: HTMLElement) {
    const fit = card.querySelector<HTMLElement>(".gw-fit");
    const frame = fit?.parentElement;
    if (!fit || !frame) return;
    if (forceLive) {
      fit.style.transform = "";
      return;
    }
    const fw = frame.clientWidth;
    const fh = frame.clientHeight;
    const cw = fit.offsetWidth;
    const ch = fit.offsetHeight;
    if (!cw || !ch || !fw || !fh) return;
    const fs = Math.min(fw / cw, fh / ch);
    fit.style.transform = `translate(${(fw - cw * fs) / 2}px, ${(fh - ch * fs) / 2}px) scale(${fs})`;
  }

  function layout() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const phone = W <= 640;
    const TOP = phone ? 84 : 96;
    const BOTTOM = phone ? 92 : 76;
    const availH = Math.max(160, H - TOP - BOTTOM);
    const availW = W - (phone ? 48 : 180);
    metrics.current = { W, TOP, availH };
    let x = 0;
    geom.current = sections.map((_, i) => {
      const card = cardRefs.current[i];
      const slot = slotRefs.current[i];
      if (!card || !slot) return { s: 1, c: x };
      fitContent(card);
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

  // Re-measure only when something can actually change a card's natural
  // size: the initial mount, a season switch (new data grids), or the
  // finish/qualifying toggle. Without a dependency array this used to
  // re-run after every commit, including every focus change while
  // dragging — forcing a synchronous reflow of every card (now some of
  // them stack two full tables) on each one. At fit zoom, keep the
  // focused card centred.
  useLayoutEffect(() => {
    // Capture mode (noSnapshot=1) renders cards at their natural size, so
    // the snapshot script records the content itself, not the framed card.
    wrapRef.current?.classList.toggle("gw-capture", forceLive);
    layout();
    if (Math.abs(view.current.k - 1) < 0.02 && !target.current) {
      view.current = { k: 1, tx: txFor(focusRef.current, 1), ty: 0 };
    }
    apply();
    stripRef.current?.classList.remove("pending");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season, freqView, forceLive, variant, failedSnapshots]);

  // Both tab strips (the desktop top bar and the phone bottom bar) rest the
  // open card's tab at their left edge. Only the visible one moves.
  useEffect(() => {
    for (const [ref, flag] of [
      [tabsRef, tabsProgrammatic],
      [pillsRef, pillsProgrammatic],
    ] as const) {
      const track = ref.current;
      const tab = track?.children[focus] as HTMLElement | undefined;
      if (!track || !tab || !track.offsetParent) continue;
      if (ref === pillsRef && pillsHeld.current) continue;
      const left = tab.offsetLeft - track.offsetLeft;
      if (Math.abs(track.scrollLeft - left) < 1) continue;
      flag.current = true;
      track.scrollTo({ left, behavior: "smooth" });
    }
  }, [focus]);

  // Scrolling or swiping a tab strip by hand also browses: once it comes to
  // rest, the tab sitting at the left opens.
  function settleStrip(track: HTMLElement | null, flag: { current: boolean }) {
    window.clearTimeout(tabsSettle.current);
    tabsSettle.current = window.setTimeout(() => {
      if (!track) return;
      if (track === pillsRef.current && pillsHeld.current) {
        if (pillsHeld.current === "finger") return;
        pillsHeld.current = null;
      } else if (flag.current) {
        flag.current = false;
        return;
      }
      let best = 0;
      let bd = Infinity;
      Array.from(track.children).forEach((el, i) => {
        const d = Math.abs((el as HTMLElement).offsetLeft - track.offsetLeft - track.scrollLeft);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      // Always aim the camera, even if the open card already matches: it
      // may only be passing that card on its way somewhere else.
      goTo(best);
      dismissHint();
    }, 160);
  }

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

    // The bars, arrows and their controls sit inside the wrap, but presses,
    // drags and wheel scrolls on them must never move or zoom the cards.
    function onChrome(e: Event) {
      return e.target instanceof Element && !!e.target.closest(".gw-topbar, .gw-jumpbar, .gw-arrow");
    }

    function onPointerDown(e: PointerEvent) {
      if (onChrome(e)) return;
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
      // Presses that started on the bars or arrows were never tracked.
      if (!pointers.delete(e.pointerId)) return;
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

    // Wheel or trackpad scrolling over the top tab strip steps one tab at a
    // time (either direction), so you can always get back from the last card.
    let tabWheel = 0;
    let tabWheelAt = 0;
    function onTabsWheel(e: WheelEvent) {
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      const d = (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * unit;
      const now = Date.now();
      if (now - tabWheelAt > 300) tabWheel = 0;
      tabWheel += d;
      if (Math.abs(tabWheel) < 40 || now - tabWheelAt < 260) return;
      tabWheelAt = now;
      const step = tabWheel > 0 ? 1 : -1;
      tabWheel = 0;
      goTo(Math.max(0, Math.min(sections.length - 1, focusRef.current + step)));
      setHintGone(true);
    }

    // Vertical wheel zooms (the ask was "zoom via scroll"); a sideways
    // trackpad swipe or shift+wheel browses the strip instead. Trackpad
    // pinch arrives as ctrl+wheel with small deltas, hence its higher rate.
    function onWheel(e: WheelEvent) {
      if (onChrome(e)) {
        e.preventDefault();
        if (e.target instanceof Element && e.target.closest(".gw-toptabs-track")) onTabsWheel(e);
        return;
      }
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
      if (onChrome(e)) return;
      e.preventDefault();
      lastGestureScale = 1;
    }
    function onGestureChange(e: Event) {
      if (onChrome(e)) return;
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

    // A mouse can't scroll an overflowing strip by itself, so holding and
    // dragging the top tab strip scrolls it; on release it snaps, and the
    // tab that comes to rest at the left opens (see settleStrip).
    const track = tabsRef.current;
    let tabDrag: { id: number; x: number; left: number; moved: boolean } | null = null;
    function onTrackDown(e: PointerEvent) {
      if (e.pointerType !== "mouse" || e.button !== 0 || !track) return;
      tabDrag = { id: e.pointerId, x: e.clientX, left: track.scrollLeft, moved: false };
      tabsProgrammatic.current = false;
    }
    function onTrackMove(e: PointerEvent) {
      if (!tabDrag || e.pointerId !== tabDrag.id || !track) return;
      const dx = e.clientX - tabDrag.x;
      if (!tabDrag.moved && Math.abs(dx) > 4) {
        tabDrag.moved = true;
        tabsDragged.current = true;
        track.classList.add("dragging");
      }
      if (tabDrag.moved) track.scrollLeft = tabDrag.left - dx;
    }
    function onTrackUp(e: PointerEvent) {
      if (!tabDrag || e.pointerId !== tabDrag.id || !track) return;
      const wasMoved = tabDrag.moved;
      tabDrag = null;
      if (!wasMoved) return;
      track.classList.remove("dragging");
      window.setTimeout(() => {
        tabsDragged.current = false;
      }, 0);
    }
    track?.addEventListener("pointerdown", onTrackDown);
    window.addEventListener("pointermove", onTrackMove);
    window.addEventListener("pointerup", onTrackUp);

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
      track?.removeEventListener("pointerdown", onTrackDown);
      window.removeEventListener("pointermove", onTrackMove);
      window.removeEventListener("pointerup", onTrackUp);
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
                <div className={"section-header" + (section.headerActions ? " gw-card-head" : "")}>
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                      {section.title}
                    </h2>
                    <p className="text-sm">{section.subtitle}</p>
                  </div>
                  {section.headerActions?.()}
                </div>
                <div className="gw-frame">
                  <div className="gw-fit gw-snap-target" data-section={section.id}>
                    {(() => {
                      const src = snapshotSrc(section.id);
                      const name = section.id === "freq" ? `freq-${freqView}` : section.id;
                      const size = SNAPSHOT_SIZE[name];
                      if (!src || !size || failedSnapshots.has(src)) return section.render();
                      return (
                        <img
                          key={src}
                          src={src}
                          alt=""
                          width={size.w}
                          height={size.h}
                          draggable={false}
                          onError={() => setFailedSnapshots((prev) => new Set(prev).add(src))}
                        />
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="gw-topbar">
        {/* The logo is its own island, and takes you back to the first card. */}
        <button
          type="button"
          className="gw-brand"
          aria-label="Grid Walk: back to the first card"
          onClick={() => {
            goTo(0);
            dismissHint();
          }}
        >
          <span className="gw-brand-mark" aria-hidden="true">
            <svg width="22" height="14" viewBox="0 0 22 14" fill="currentColor">
              <path d="M0 14L6 0h4L4 14H0z" />
              <path d="M7 14L13 0h4L11 14H7z" />
              <path d="M14 14L20 0h2L16 14h-2z" />
            </svg>
          </span>
          <span className="gw-brand-text">Grid Walk</span>
        </button>
        {/* On desktop this is one nav bar: the jump tabs, then About and the
            toggles. On phones it dissolves (display: contents), the tabs are
            hidden, and the controls sit on their own as before. */}
        <div className="gw-navpill">
          <nav className="gw-toptabs" aria-label="Jump to">
            <div className="gw-toptabs-track" ref={tabsRef} onScroll={() => settleStrip(tabsRef.current, tabsProgrammatic)}>
              {sections.map((section, i) => (
                <button
                  key={section.id}
                  type="button"
                  className={"gw-toptab" + (i === focus ? " active" : "")}
                  aria-current={i === focus ? "true" : undefined}
                  onClick={() => {
                    if (tabsDragged.current) return;
                    window.clearTimeout(tabsSettle.current);
                    tabsProgrammatic.current = true;
                    goTo(i);
                    dismissHint();
                  }}
                >
                  {section.navLabel ?? section.title}
                </button>
              ))}
            </div>
          </nav>
          <span className="gw-navpill-divider" aria-hidden="true" />
          <div className="gw-topbar-right">
            <button type="button" className="gw-about-link" onClick={() => router.push("/about")}>
              About
            </button>
            <ThemeToggle iconOnly />
            <AccentToggle iconOnly />
            <SeasonSelector initialSeason={season} />
          </div>
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
        <div
          className="gw-jumpbar-pills"
          ref={pillsRef}
          onScroll={() => settleStrip(pillsRef.current, pillsProgrammatic)}
          // A finger on the strip takes over from any glide still running,
          // and the strip settles only once it's lifted. Touch events, as
          // pointer events are cancelled as soon as the strip starts to pan.
          onTouchStart={() => {
            pillsProgrammatic.current = false;
            pillsHeld.current = "finger";
          }}
          onTouchEnd={(e) => {
            if (e.touches.length) return;
            pillsHeld.current = "coasting";
            settleStrip(pillsRef.current, pillsProgrammatic);
          }}
          onTouchCancel={() => {
            pillsHeld.current = "coasting";
            settleStrip(pillsRef.current, pillsProgrammatic);
          }}
        >
          {sections.map((section, i) => (
            <button
              key={section.id}
              type="button"
              className={"gw-jump-pill" + (i === focus ? " active" : "")}
              aria-current={i === focus ? "true" : undefined}
              onClick={() => {
                // A tap wins over a settle still pending from a swipe, and
                // the browser nudging the tapped tab into view isn't a swipe.
                window.clearTimeout(tabsSettle.current);
                pillsProgrammatic.current = true;
                pillsHeld.current = null;
                goTo(i);
                dismissHint();
              }}
            >
              {section.navLabel ?? section.title}
            </button>
          ))}
        </div>
        <span className="gw-jumpbar-divider" aria-hidden="true" />
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
