"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./gridwalk.css";
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
  x: number;
  y: number;
  title: string;
  subtitle: string;
  render: () => React.ReactNode;
};

type View = { k: number; tx: number; ty: number };

const SPHERE_R = 760;
const YAW_K = 0.062;
const PITCH_K = 0.05;
const ZOOM = 1.3;
const BOUND_YAW = 58;
const BOUND_PITCH = 30;
const DRAG_THRESHOLD = 6; // px of movement before a pointerdown counts as a drag, not a click
const TRAVEL_EASE = 0.12; // one shared per-frame lerp for camera travel and zoom, so they read as one camera move
// Every card is shown at rest fitted inside the same square box, whatever
// its own aspect ratio. Fitting by width alone let tall cards (the podium
// bars) grow big enough that their tangent planes cut into a neighbour's
// on the sphere — that was the clipping.
const PREVIEW_BOX = 180;
const MIN_K = 0.5;
const MAX_K = 8;
// Space a dive leaves clear for the top bar and the jump bar, so a dived
// card fits between them instead of running underneath.
const CHROME_TOP = 76;
const CHROME_BOTTOM = 76;
const FIT_MARGIN = 16;

function clamp(v: number, b: number) {
  return Math.max(-b, Math.min(b, v));
}

// "Inside a sphere" CSS-3D navigation: every card sits on the sphere's
// surface via translateZ(-SPHERE_R) (the camera is at the centre looking
// out), and dragging rotates the whole rig the opposite way so content
// appears to follow the cursor. See memory "3d-mockup-exploration" before
// touching the translateZ sign or the drag-direction maths.
//
// Zoom is one flat 2D camera on gw-stage — translate(tx, ty) scale(k),
// applied after the 3D projection — so the whole picture scales together,
// Miro-style (see "grid-walk-round5-mockup" memory). Diving, scroll-wheel
// zoom, pinch zoom and Back/Reset all drive that same view.
export default function GridWalk({
  season,
  pointsGrid,
  constructorGrid,
  finishSummary,
  qualifyingSummary,
}: GridWalkProps) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const distortRef = useRef<HTMLDivElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const backBtnRef = useRef<HTMLButtonElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);

  // Each card's real, unscaled content size, measured from the DOM (state,
  // not a ref, because cardPlaceStyle reads it during render).
  const [naturalSizes, setNaturalSizes] = useState<Record<string, { w: number; h: number }>>({});

  const camYaw = useRef(0);
  const camPitch = useRef(0);
  const vYaw = useRef(0);
  const vPitch = useRef(0);
  const dragging = useRef(false);
  const dragMoved = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startYaw = useRef(0);
  const startPitch = useRef(0);
  const pointerSpeed = useRef(0);
  const distortScale = useRef(10);
  const shownMx = useRef(50);
  const shownMy = useRef(50);
  const targetMx = useRef(50);
  const targetMy = useRef(50);
  const travelTarget = useRef<{ yaw: number; pitch: number } | null>(null);

  const view = useRef<View>({ k: 1, tx: 0, ty: 0 });
  const viewTarget = useRef<View | null>(null);
  const clearFocusOnSettle = useRef(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null);
  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);

  // An 8-point ring, 45° apart, running clockwise on screen from the top in
  // the same order as the jump bar. Negative x is to the RIGHT on screen
  // (the rig rotates opposite to the card's own yaw), which is why the
  // right-hand side of the ring carries negative values.
  const sections: SectionDef[] = [
    {
      id: "results",
      x: 0,
      y: 24,
      title: "Results",
      subtitle: "Points scored by each driver per Grand Prix.",
      render: () => <PointsHeatmap grid={pointsGrid} />,
    },
    {
      id: "constructors",
      x: -30,
      y: 17,
      title: "Constructors",
      subtitle: "Points scored by each team per Grand Prix.",
      render: () => <ConstructorPointsHeatmap grid={constructorGrid} />,
    },
    {
      id: "evolution",
      x: -42,
      y: 0,
      title: "Driver Points Evolution",
      subtitle: "Cumulative points scored by each driver across the season.",
      render: () => <DriverPointsEvolutionChart grid={pointsGrid} />,
    },
    {
      id: "positions",
      x: -30,
      y: -17,
      title: "Positions",
      subtitle: "Where each driver finished in every Grand Prix.",
      render: () => <PointsHeatmap grid={pointsGrid} mode="position" />,
    },
    {
      id: "finishfreq",
      x: 0,
      y: -24,
      title: "Finish Frequency",
      subtitle: "How often each driver has finished in each position.",
      render: () => <FinishPositionsGrid summary={finishSummary} />,
    },
    {
      id: "qualifreq",
      x: 30,
      y: -17,
      title: "Qualifying Frequency",
      subtitle: "How often each driver has qualified in each grid position.",
      render: () => <QualifyingPositionsGrid summary={qualifyingSummary} />,
    },
    {
      id: "podiumsD",
      x: 42,
      y: 0,
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
      x: 30,
      y: 17,
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

  // Re-measures every card after each commit; only sets state when a size
  // actually changed, so it settles after one extra pass.
  useLayoutEffect(() => {
    setNaturalSizes((prev) => {
      let changed = false;
      const next = { ...prev };
      sections.forEach((section) => {
        const el = cardRefs.current[section.id];
        if (!el) return;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const p = prev[section.id];
        if (!p || p.w !== w || p.h !== h) {
          next[section.id] = { w, h };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  });

  function travelTo(yaw: number, pitch: number) {
    travelTarget.current = { yaw: clamp(yaw, BOUND_YAW), pitch: clamp(pitch, BOUND_PITCH) };
    vYaw.current = 0;
    vPitch.current = 0;
  }

  function applyCamera() {
    if (rigRef.current) {
      rigRef.current.style.transform = `scale(${ZOOM}) rotateX(${camPitch.current}deg) rotateY(${-camYaw.current}deg)`;
    }
  }

  function applyView() {
    const stage = stageRef.current;
    if (!stage) return;
    const { k, tx, ty } = view.current;
    stage.style.transform =
      k === 1 && tx === 0 && ty === 0 ? "" : `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${k.toFixed(4)})`;
  }

  // Zooms by `factor` keeping the screen point (px, py) fixed under the
  // cursor or pinch midpoint — the standard map/canvas zoom.
  function zoomAt(px: number, py: number, factor: number) {
    viewTarget.current = null;
    clearFocusOnSettle.current = false;
    const v = view.current;
    const k = Math.max(MIN_K, Math.min(MAX_K, v.k * factor));
    const f = k / v.k;
    view.current = { k, tx: px - (px - v.tx) * f, ty: py - (py - v.ty) * f };
    applyView();
    if (activeRef.current) setActiveId(null);
  }

  function panBy(dx: number, dy: number) {
    view.current = { ...view.current, tx: view.current.tx + dx, ty: view.current.ty + dy };
    applyView();
  }

  // Renders the card's own centring rotation for one synchronous frame with
  // the stage's zoom stripped out, reads its on-screen rect, then restores
  // both — never painted. Gives the card's "cold" (k=1) centred position.
  function measureCenteredRect(section: SectionDef) {
    const rig = rigRef.current;
    const stage = stageRef.current;
    const el = cardRefs.current[section.id];
    if (!rig || !stage || !el) return null;
    const savedStage = stage.style.transform;
    rig.style.transform = `scale(${ZOOM}) rotateX(${section.y}deg) rotateY(${-section.x}deg)`;
    stage.style.transform = "";
    const rect = el.getBoundingClientRect();
    applyCamera();
    stage.style.transform = savedStage;
    return rect;
  }

  function isZoomed() {
    const v = view.current;
    return Math.abs(v.k - 1) > 0.01 || Math.abs(v.tx) > 0.5 || Math.abs(v.ty) > 0.5 || viewTarget.current !== null;
  }

  // Back button and headline/brand follow the actual zoom level every frame
  // (direct DOM writes, not state), since manual zoom and dives both change it.
  function syncChrome() {
    const zoomed = isZoomed();
    backBtnRef.current?.classList.toggle("show", zoomed);
    brandRef.current?.classList.toggle("gw-hide", zoomed);
    headlineRef.current?.classList.toggle("gw-hide", zoomed);
  }

  useEffect(() => {
    const wrap = wrapRef.current;
    const rig = rigRef.current;
    const distortLayer = distortRef.current;
    const dispEl = dispRef.current;
    if (!wrap || !rig) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch: { dist: number; mx: number; my: number } | null = null;

    function pinchState() {
      const [a, b] = [...pointers.values()];
      return { dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    }

    function onPointerDown(e: PointerEvent) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        // Second finger down: stop rotating and switch to pinch zoom. Counts
        // as a "move" so lifting the fingers never fires a card click.
        dragging.current = false;
        dragMoved.current = true;
        wrap!.classList.remove("dragging");
        pinch = pinchState();
        return;
      }
      if (pointers.size > 2) return;
      dragging.current = true;
      dragMoved.current = false;
      travelTarget.current = null;
      startX.current = e.clientX;
      startY.current = e.clientY;
      startYaw.current = camYaw.current;
      startPitch.current = camPitch.current;
      vYaw.current = 0;
      vPitch.current = 0;
      wrap!.classList.add("dragging");
      // No setPointerCapture: it retargets the synthesized click to wrap, so
      // a card's own onClick would never fire.
    }

    function onPointerMove(e: PointerEvent) {
      targetMx.current = (e.clientX / window.innerWidth) * 100;
      targetMy.current = (e.clientY / window.innerHeight) * 100;

      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pinch && pointers.size === 2) {
        const next = pinchState();
        panBy(next.mx - pinch.mx, next.my - pinch.my);
        if (pinch.dist > 0) zoomAt(next.mx, next.my, next.dist / pinch.dist);
        pinch = next;
        return;
      }

      if (!dragging.current) return;
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;
      if (!dragMoved.current && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        dragMoved.current = true;
        // A real drag while dived lets go of the focused card but keeps the
        // zoom, so the camera pans across the zoomed-in canvas.
        if (activeRef.current) setActiveId(null);
      }

      // Divide by the zoom so a drag moves the content about as far as the
      // pointer moved, however far in the user has zoomed.
      const k = Math.max(1, view.current.k);
      const nextYaw = clamp(startYaw.current + (dx * YAW_K) / k, BOUND_YAW);
      const nextPitch = clamp(startPitch.current + (dy * PITCH_K) / k, BOUND_PITCH);
      vYaw.current = nextYaw - camYaw.current;
      vPitch.current = nextPitch - camPitch.current;
      camYaw.current = nextYaw;
      camPitch.current = nextPitch;
      pointerSpeed.current = Math.min(40, Math.hypot(dx, dy) * 0.08);
      applyCamera();
    }

    function onPointerUp(e: PointerEvent) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0) {
        dragging.current = false;
        wrap!.classList.remove("dragging");
      }
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      // Trackpad pinch arrives as a ctrlKey wheel with small deltas, so it
      // gets a stronger rate than a mouse wheel's notches.
      const rate = e.ctrlKey ? 0.01 : 0.0015;
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * unit * rate));
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

    wrap.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    wrap.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("gesturestart", onGestureStart);
    wrap.addEventListener("gesturechange", onGestureChange);

    let raf = 0;
    function animate() {
      if (!dragging.current) {
        if (travelTarget.current) {
          camYaw.current += (travelTarget.current.yaw - camYaw.current) * TRAVEL_EASE;
          camPitch.current += (travelTarget.current.pitch - camPitch.current) * TRAVEL_EASE;
          if (
            Math.abs(travelTarget.current.yaw - camYaw.current) < 0.05 &&
            Math.abs(travelTarget.current.pitch - camPitch.current) < 0.05
          ) {
            camYaw.current = travelTarget.current.yaw;
            camPitch.current = travelTarget.current.pitch;
            travelTarget.current = null;
          }
          applyCamera();
        } else {
          camYaw.current = clamp(camYaw.current + vYaw.current, BOUND_YAW);
          camPitch.current = clamp(camPitch.current + vPitch.current, BOUND_PITCH);
          vYaw.current *= 0.92;
          vPitch.current *= 0.92;
          if (Math.abs(vYaw.current) > 0.001 || Math.abs(vPitch.current) > 0.001) applyCamera();
        }

        // k, tx and ty ease at the same rate, so a point that starts at the
        // card's centre travels in a straight line to its target spot.
        const t = viewTarget.current;
        if (t) {
          const v = view.current;
          const next = {
            k: v.k + (t.k - v.k) * TRAVEL_EASE,
            tx: v.tx + (t.tx - v.tx) * TRAVEL_EASE,
            ty: v.ty + (t.ty - v.ty) * TRAVEL_EASE,
          };
          if (Math.abs(t.k - next.k) < 0.002 && Math.abs(t.tx - next.tx) < 0.5 && Math.abs(t.ty - next.ty) < 0.5) {
            view.current = t;
            viewTarget.current = null;
            if (clearFocusOnSettle.current) {
              clearFocusOnSettle.current = false;
              setActiveId(null);
            }
          } else {
            view.current = next;
          }
          applyView();
        }
      }

      syncChrome();

      if (distortLayer) {
        const targetDistort = reduceMotion ? 8 : Math.min(95, 10 + pointerSpeed.current * 1.6);
        distortScale.current += (targetDistort - distortScale.current) * 0.12;
        pointerSpeed.current *= 0.85;
        shownMx.current += (targetMx.current - shownMx.current) * 0.18;
        shownMy.current += (targetMy.current - shownMy.current) * 0.18;
        distortLayer.style.setProperty("--mx", shownMx.current.toFixed(1) + "%");
        distortLayer.style.setProperty("--my", shownMy.current.toFixed(1) + "%");
        dispEl?.setAttribute("scale", distortScale.current.toFixed(1));
      }

      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);
    applyCamera();

    return () => {
      wrap.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("gesturestart", onGestureStart);
      wrap.removeEventListener("gesturechange", onGestureChange);
      cancelAnimationFrame(raf);
    };
    // Runs once: everything it reads that changes over time is a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function placeStyle(yawDeg: number, pitchDeg: number): React.CSSProperties {
    return {
      transform: `translate(-50%, -50%) rotateY(${yawDeg}deg) rotateX(${-pitchDeg}deg) translateZ(${-SPHERE_R}px)`,
    };
  }

  function cardPlaceStyle(section: SectionDef): React.CSSProperties {
    const natural = naturalSizes[section.id];
    const previewScale = natural ? Math.min(PREVIEW_BOX / natural.w, PREVIEW_BOX / natural.h) : 1;
    return {
      transform: `translate(-50%, -50%) rotateY(${section.x}deg) rotateX(${-section.y}deg) translateZ(${-SPHERE_R}px) scale(${previewScale})`,
    };
  }

  // Dive: rotate toward the card and zoom so the whole card fits between
  // the top bar and the jump bar (never past its own natural size). From
  // there, scroll or pinch zooms further in for detail. The zoom factor
  // uses the geometric mean of the width and height ratios because an
  // off-centre card's measured rect carries a little perspective skew.
  function diveInto(section: SectionDef) {
    if (dragMoved.current) return;
    if (activeId === section.id && viewTarget.current) return;

    const rect = measureCenteredRect(section);
    if (!rect) return;
    const ox = rect.left + rect.width / 2;
    const oy = rect.top + rect.height / 2;

    const natural = naturalSizes[section.id];
    const naturalK = natural ? Math.sqrt((natural.w / rect.width) * (natural.h / rect.height)) : MAX_K;
    const availW = window.innerWidth - FIT_MARGIN * 2;
    const availH = window.innerHeight - CHROME_TOP - CHROME_BOTTOM;
    const fitK = Math.min(availW / rect.width, availH / rect.height);
    const k = Math.max(MIN_K, Math.min(naturalK, fitK));

    const cx = window.innerWidth / 2;
    const cy = CHROME_TOP + availH / 2;
    viewTarget.current = { k, tx: cx - k * ox, ty: cy - k * oy };
    clearFocusOnSettle.current = false;

    travelTo(section.x, section.y);
    setActiveId(section.id);
  }

  function diveOut() {
    viewTarget.current = { k: 1, tx: 0, ty: 0 };
    clearFocusOnSettle.current = true;
  }

  function resetView() {
    diveOut();
    travelTo(0, 0);
  }

  return (
    <div className="gw-wrap" ref={wrapRef}>
      <div className="gw-pulse-a" />
      <div className="gw-pulse-b" />
      <div className="gw-distort" ref={distortRef} />
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id="gw-distortion-filter">
          <feTurbulence baseFrequency="0.006 0.009" numOctaves={1} seed={7} result="turb" />
          <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="turb" scale={10} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div className="gw-stage" ref={stageRef}>
        <div className="gw-rig" ref={rigRef}>
          <div className="gw-headline" ref={headlineRef} style={placeStyle(0, 0)}>
            <h1>Grid Walk</h1>
            <p>{season} season — drag to look around, scroll or pinch to zoom, click a card to dive in.</p>
          </div>

          {sections.map((section) => (
            <div
              key={section.id}
              ref={(el) => {
                cardRefs.current[section.id] = el;
              }}
              className={
                "gw-card" +
                // Hidden until measured: the server render can't know each
                // card's size, so without this every card painted full size
                // for a moment, piled on top of each other.
                (naturalSizes[section.id] ? "" : " gw-card-pending") +
                (section.id === activeId ? " gw-card-inert" : "") +
                (activeId !== null && section.id !== activeId ? " gw-faded" : "")
              }
              style={cardPlaceStyle(section)}
              onClick={() => diveInto(section)}
              role="button"
              tabIndex={0}
              aria-label={`${section.title}: ${section.subtitle}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") diveInto(section);
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
          ))}
        </div>
      </div>

      <button type="button" className="gw-back-btn" ref={backBtnRef} onClick={diveOut} aria-label="Back to Grid Walk">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      {/* Stays on screen through a dive; only the brand hides, since the Back
          button takes its corner. syncChrome() drives both. */}
      <div className="gw-topbar">
        <div className="gw-brand" ref={brandRef}>
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

      <div className="gw-jumpbar">
        <span className="gw-jumpbar-label">Jump to</span>
        <div className="gw-jumpbar-pills">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={"gw-jump-pill" + (section.id === activeId ? " active" : "")}
              onClick={() => diveInto(section)}
            >
              {section.title}
            </button>
          ))}
          <button type="button" className="gw-jump-pill gw-jump-reset" onClick={resetView}>
            <span className="gw-reset-dot" aria-hidden="true" />
            Reset view
          </button>
        </div>
      </div>
    </div>
  );
}
