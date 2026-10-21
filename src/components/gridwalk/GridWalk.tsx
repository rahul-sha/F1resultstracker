"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./gridwalk.css";
import {
  ResultsIcon,
  ConstructorsIcon,
  EvolutionIcon,
  PositionsIcon,
  FinishFreqIcon,
  QualifyingFreqIcon,
  DriverPodiumsIcon,
  ConstructorPodiumsIcon,
} from "@/components/nav-icons";
import SeasonSelector from "@/components/SeasonSelector";
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

export interface GridWalkStat {
  label: string;
  value: string;
}

export interface GridWalkMiniStat {
  code: string;
  value: string;
}

export interface GridWalkProps {
  season: number;
  driverLeader: GridWalkStat | null;
  constructorLeader: GridWalkStat | null;
  podiumLeader: GridWalkStat | null;
  topDrivers: GridWalkMiniStat[];
  topPodiumDrivers: GridWalkMiniStat[];
  pointsGrid: PointsGrid;
  constructorGrid: ConstructorPointsGrid;
  finishSummary: FinishPositionSummary;
  qualifyingSummary: QualifyingPositionSummary;
}

type SectionDef = {
  id: string;
  x: number;
  y: number;
  z: number;
  eyebrow: string;
  tabColor: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  stat: string;
  statLabel: string;
  miniStats?: GridWalkMiniStat[];
  renderFull: () => React.ReactNode;
};

const SPHERE_R = 760;
const YAW_K = 0.062;
const PITCH_K = 0.05;
const ZOOM = 1.3;
const BOUND_YAW = 58;
const BOUND_PITCH = 30;
const DRAG_THRESHOLD = 6; // px of movement before a pointerdown counts as a drag, not a click
const TRAVEL_EASE = 0.12; // per-frame lerp factor for the "jump to" camera travel
const DIVE_MS = 700;
const DIVE_EASE = "cubic-bezier(.22,.7,.2,1)";
// How long to let the camera travel toward a dived-into card before
// measuring its rect and growing it — needs to exceed how long
// TRAVEL_EASE actually takes to converge (see 3d-mockup-exploration
// memory: ~750ms+ for a large yaw/pitch offset at this ease factor), or
// the overlay snaps onto a rect the card hasn't finished traveling to —
// it then visibly jumps to the wrong spot right as it starts growing,
// which reads as a second element appearing rather than the same card
// continuing to zoom.
const DIVE_SETTLE_MS = 820;

function clamp(v: number, b: number) {
  return Math.max(-b, Math.min(b, v));
}

// "Inside a sphere" CSS-3D navigation: every card sits on the sphere's
// surface via translateZ(-SPHERE_R) (negative — the camera is at the
// centre looking out, so content recedes into the screen rather than
// popping toward the viewer), and dragging rotates the whole rig the
// opposite way so content appears to follow the cursor. Getting the signs
// right here took real derivation — see memory "3d-mockup-exploration"
// before touching either the translateZ sign or the drag-direction math,
// since flipping one silently flips the other's apparent effect too.
//
// Diving into a card doesn't navigate to a new page: a fixed overlay,
// rendered outside the 3D rig so it's never subject to its rotation, is
// snapped (via getBoundingClientRect) onto the clicked card's on-screen
// rect and then grown with a plain 2D CSS transition to near-fullscreen —
// a FLIP technique that reads as the card itself zooming in, like a very
// large photo, rather than a different element opening. Growing the
// card's own DOM node in place (while still inside the rotated/perspective
// rig) was tried first and produces severe skew at large sizes once the
// card is magnified — see "grid-walk-8-section-redesign" memory.
export default function GridWalk({
  season,
  driverLeader,
  constructorLeader,
  podiumLeader,
  topDrivers,
  topPodiumDrivers,
  pointsGrid,
  constructorGrid,
  finishSummary,
  qualifyingSummary,
}: GridWalkProps) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const distortRef = useRef<HTMLDivElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const restRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);

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
  // Set by the "jump to" bar and by diving into a card; the animate loop
  // eases the camera toward it and clears it once close, so a drag can
  // always interrupt a travel.
  const travelTarget = useRef<{ yaw: number; pitch: number } | null>(null);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overlayShown, setOverlayShown] = useState(false);
  const diving = activeId !== null;

  const sections: SectionDef[] = [
    {
      id: "results",
      x: -46,
      y: 18,
      z: 0,
      eyebrow: "/results",
      tabColor: "#ff8000",
      title: "Results",
      desc: "Points per Grand Prix, heatmapped across the season.",
      icon: <ResultsIcon size={20} />,
      stat: driverLeader?.value.split(" — ")[1] ?? "—",
      statLabel: driverLeader?.value.split(" — ")[0] ?? "Leading driver",
      miniStats: topDrivers,
      renderFull: () => <PointsHeatmap grid={pointsGrid} />,
    },
    {
      id: "constructors",
      x: -20,
      y: 6,
      z: 15,
      eyebrow: "/results",
      tabColor: "#ff8000",
      title: "Constructors",
      desc: "Team points per race, same grid.",
      icon: <ConstructorsIcon size={20} />,
      stat: constructorLeader?.value.split(" — ")[1] ?? "—",
      statLabel: constructorLeader?.value.split(" — ")[0] ?? "Leading team",
      renderFull: () => <ConstructorPointsHeatmap grid={constructorGrid} />,
    },
    {
      id: "evolution",
      x: 10,
      y: 22,
      z: -8,
      eyebrow: "/results",
      tabColor: "#66d9ef",
      title: "Points Evolution",
      desc: "Cumulative driver points race by race.",
      icon: <EvolutionIcon size={20} />,
      stat: `${pointsGrid.rows.length}`,
      statLabel: "drivers tracked",
      renderFull: () => <DriverPointsEvolutionChart grid={pointsGrid} />,
    },
    {
      id: "positions",
      x: 38,
      y: 9,
      z: 10,
      eyebrow: "/positions",
      tabColor: "#3671c6",
      title: "Positions",
      desc: "Finishing and qualifying positions, driver by driver.",
      icon: <PositionsIcon size={20} />,
      stat: `${finishSummary.maxPosition}`,
      statLabel: "grid slots tracked",
      renderFull: () => <PointsHeatmap grid={pointsGrid} mode="position" />,
    },
    {
      id: "finishfreq",
      x: -33,
      y: -20,
      z: 5,
      eyebrow: "/positions",
      tabColor: "#3671c6",
      title: "Finish Frequency",
      desc: "How often each driver finishes in each position band.",
      icon: <FinishFreqIcon size={20} />,
      stat: `${finishSummary.drivers.length}`,
      statLabel: "drivers tracked",
      renderFull: () => <FinishPositionsGrid summary={finishSummary} />,
    },
    {
      id: "qualifreq",
      x: -2,
      y: -9,
      z: 20,
      eyebrow: "/positions",
      tabColor: "#00d2be",
      title: "Qualifying Frequency",
      desc: "How often each driver qualifies in each position band.",
      icon: <QualifyingFreqIcon size={20} />,
      stat: `${qualifyingSummary.maxPosition}`,
      statLabel: "grid slots tracked",
      renderFull: () => <QualifyingPositionsGrid summary={qualifyingSummary} />,
    },
    {
      id: "podiumsD",
      x: 24,
      y: -26,
      z: -5,
      eyebrow: "/positions",
      tabColor: "#ff8000",
      title: "Driver Podiums",
      desc: "Podium finishes, driver by driver.",
      icon: <DriverPodiumsIcon size={20} />,
      stat: podiumLeader?.value.split(" — ")[1] ?? "—",
      statLabel: podiumLeader?.value.split(" — ")[0] ?? "Most podiums",
      miniStats: topPodiumDrivers,
      renderFull: () => (
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
      x: 48,
      y: -6,
      z: 12,
      eyebrow: "/positions",
      tabColor: "#f92672",
      title: "Constructor Podiums",
      desc: "Podium finishes, team by team.",
      icon: <ConstructorPodiumsIcon size={20} />,
      stat: `${finishSummary.teamPodiums.length}`,
      statLabel: "teams on the podium",
      renderFull: () => (
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

  const activeSection = sections.find((s) => s.id === activeId) ?? null;

  function travelTo(yaw: number, pitch: number) {
    travelTarget.current = { yaw: clamp(yaw, BOUND_YAW), pitch: clamp(pitch, BOUND_PITCH) };
    vYaw.current = 0;
    vPitch.current = 0;
  }

  useEffect(() => {
    const wrap = wrapRef.current;
    const rig = rigRef.current;
    const distortLayer = distortRef.current;
    const dispEl = dispRef.current;
    if (!wrap || !rig) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function applyCamera() {
      rig!.style.transform = `scale(${ZOOM}) rotateX(${camPitch.current}deg) rotateY(${-camYaw.current}deg)`;
    }

    function onPointerDown(e: PointerEvent) {
      if (diving) return;
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
      // Deliberately no setPointerCapture here: capturing the pointer on
      // wrap retargets the browser's synthesized click event to wrap too,
      // so a card's own onClick never fires. The drag already keeps working
      // outside wrap's bounds because pointermove/pointerup are bound on
      // window below, not on wrap, so capture buys nothing here.
    }

    function onPointerMove(e: PointerEvent) {
      targetMx.current = (e.clientX / window.innerWidth) * 100;
      targetMy.current = (e.clientY / window.innerHeight) * 100;

      if (!dragging.current) return;
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) dragMoved.current = true;

      const nextYaw = clamp(startYaw.current + dx * YAW_K, BOUND_YAW);
      const nextPitch = clamp(startPitch.current + dy * PITCH_K, BOUND_PITCH);
      vYaw.current = nextYaw - camYaw.current;
      vPitch.current = nextPitch - camPitch.current;
      camYaw.current = nextYaw;
      camPitch.current = nextPitch;
      pointerSpeed.current = Math.min(40, Math.hypot(dx, dy) * 0.08);
      applyCamera();
    }

    function onPointerUp() {
      dragging.current = false;
      wrap!.classList.remove("dragging");
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
    }

    wrap.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    wrap.addEventListener("wheel", onWheel, { passive: false });

    let raf = 0;
    function animate() {
      // Gated on drag only (not on "diving"): a dive sets a travel target
      // to centre the clicked card, and that travel still needs to run
      // during the dive, or the card never actually lands in the middle of
      // the screen before the overlay measures it.
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
      }

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
      wrap.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diving]);

  // x/y here are each card's own yaw/pitch degrees on the sphere — unlike
  // the YAW_K/PITCH_K constants above, which only convert a drag's pixel
  // delta into a camera-rotation degree, placement needs real angular
  // separation (a few degrees of yaw at this translateZ puts two cards
  // almost exactly on top of each other on screen).
  function placeStyle(yawDeg: number, pitchDeg: number, extraZ = 0): React.CSSProperties {
    return {
      transform: `translate(-50%, -50%) rotateY(${yawDeg}deg) rotateX(${-pitchDeg}deg) translateZ(${-(SPHERE_R + extraZ)}px)`,
    };
  }

  function diveInto(section: SectionDef) {
    if (dragMoved.current || diving) return;
    setActiveId(section.id);
    travelTo(section.x, section.y);

    window.setTimeout(() => {
      const el = cardRefs.current[section.id];
      const overlay = overlayRef.current;
      if (!el || !overlay) return;
      const rect = el.getBoundingClientRect();
      restRectRef.current = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };

      overlay.style.transition = "none";
      overlay.style.left = `${rect.left}px`;
      overlay.style.top = `${rect.top}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      setOverlayShown(true);
      // The real card stays fully visible up to this exact instant (it
      // isn't faded by React state — see the className below) so it
      // visibly travels with the camera into place; only now, with the
      // overlay sitting at the identical on-screen rect, do we swap which
      // one is showing. That swap is invisible, so what the viewer sees is
      // one continuous object that then grows — not a card disappearing
      // and a different element opening in its place.
      el.style.opacity = "0";
      // Force layout so the browser registers the start rect before the
      // transition below is applied — otherwise it would animate from
      // whatever the overlay's previous (or default) box was instead.
      void overlay.offsetHeight;

      const targetW = Math.min(window.innerWidth * 0.92, 1100);
      const targetH = Math.min(window.innerHeight * 0.82, 700);
      const targetL = (window.innerWidth - targetW) / 2;
      const targetT = (window.innerHeight - targetH) / 2;

      overlay.style.transition = `left ${DIVE_MS}ms ${DIVE_EASE}, top ${DIVE_MS}ms ${DIVE_EASE}, width ${DIVE_MS}ms ${DIVE_EASE}, height ${DIVE_MS}ms ${DIVE_EASE}`;
      overlay.style.left = `${targetL}px`;
      overlay.style.top = `${targetT}px`;
      overlay.style.width = `${targetW}px`;
      overlay.style.height = `${targetH}px`;
    }, DIVE_SETTLE_MS);
  }

  function diveOut() {
    const overlay = overlayRef.current;
    const rect = restRectRef.current;
    if (!overlay || !rect) return;

    overlay.style.transition = `left ${DIVE_MS}ms ${DIVE_EASE}, top ${DIVE_MS}ms ${DIVE_EASE}, width ${DIVE_MS}ms ${DIVE_EASE}, height ${DIVE_MS}ms ${DIVE_EASE}`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    window.setTimeout(() => {
      // Swap back the instant before the overlay goes away, at the same
      // rect it grew from, so this reverses as the same invisible swap.
      if (activeId) {
        const el = cardRefs.current[activeId];
        if (el) el.style.opacity = "";
      }
      setOverlayShown(false);
      setActiveId(null);
      restRectRef.current = null;
    }, DIVE_MS + 40);
  }

  const stats: { x: number; y: number; stat: GridWalkStat | null }[] = [
    { x: -28, y: 25, stat: driverLeader },
    { x: 28, y: 25, stat: constructorLeader },
    { x: 0, y: -26, stat: podiumLeader },
  ];

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

      <div className="gw-stage">
        <div className="gw-rig" ref={rigRef}>
          <div className={"gw-headline" + (diving ? " gw-hide" : "")} style={placeStyle(0, 0)}>
            <h1>F1 Results Tracker</h1>
            <p>{season} season — drag to look around, click a card to dive in.</p>
          </div>

          {sections.map((section) => (
            <div
              key={section.id}
              ref={(el) => {
                cardRefs.current[section.id] = el;
              }}
              className={
                "gw-card" +
                // The active card is left alone here (no opacity change) so
                // it stays fully visible while the camera travels toward it
                // — diveInto hides it imperatively, later, at the exact
                // instant the overlay is ready to take its place. "Inert"
                // only blocks clicks/hover during that travel.
                (section.id === activeId ? " gw-card-inert" : "") +
                (diving && section.id !== activeId ? " gw-faded" : "")
              }
              style={placeStyle(section.x, section.y, section.z)}
              onClick={() => diveInto(section)}
              onPointerEnter={() => setHoveredId(section.id)}
              onPointerLeave={() => setHoveredId((cur) => (cur === section.id ? null : cur))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") diveInto(section);
              }}
            >
              <span className="gw-card-tab" style={{ background: section.tabColor }} />
              <div className="gw-card-eyebrow">
                <span className="gw-card-eyebrow-dot" />
                {section.eyebrow}
              </div>
              <span className="gw-card-icon">{section.icon}</span>
              <h2>{section.title}</h2>
              <p>{section.desc}</p>
              <div className="gw-card-stat">
                <b>{section.stat}</b> · {section.statLabel}
              </div>
            </div>
          ))}

          {sections.map(
            (section) =>
              section.miniStats &&
              section.miniStats.length > 0 &&
              section.miniStats.map((mini, i) => {
                // Small spread so the chips cluster tight around their own
                // card — these are degrees of angular separation on the
                // sphere, same units as section.x/section.y, not pixels.
                const spread = (i - (section.miniStats!.length - 1) / 2) * 5;
                return (
                  <div
                    key={section.id + mini.code}
                    className={"gw-mini-chip" + (hoveredId === section.id && !diving ? " show" : "")}
                    style={placeStyle(section.x + spread, section.y - 9 - (i % 2) * 5, -18)}
                    aria-hidden={hoveredId !== section.id}
                  >
                    <span className="gw-mini-chip-code">{mini.code}</span> {mini.value}
                  </div>
                );
              })
          )}

          {stats.map(
            ({ x, y, stat }, i) =>
              stat && (
                <div key={i} className={"gw-chip" + (diving ? " gw-hide" : "")} style={placeStyle(x, y, -40)}>
                  {stat.label}: {stat.value}
                </div>
              )
          )}
        </div>
      </div>

      <div
        className={"gw-overlay" + (overlayShown ? " show" : "")}
        ref={overlayRef}
      >
        {activeSection && (
          <div className="gw-overlay-inner">
            <div className="gw-overlay-eyebrow">
              <span className="gw-card-eyebrow-dot" />
              {activeSection.eyebrow}
            </div>
            <h2>{activeSection.title}</h2>
            <p className="gw-overlay-sub">{activeSection.desc}</p>
            <div className="gw-overlay-body">{activeSection.renderFull()}</div>
          </div>
        )}
      </div>

      <button
        type="button"
        className={"gw-back-btn" + (diving ? " show" : "")}
        onClick={diveOut}
        aria-label="Back to Grid Walk"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      <div className={"gw-topbar" + (diving ? " gw-hide" : "")}>
        <div className="gw-brand">
          <span className="gw-brand-mark" aria-hidden="true">
            <svg width="22" height="14" viewBox="0 0 22 14" fill="currentColor">
              <path d="M0 14L6 0h4L4 14H0z" />
              <path d="M7 14L13 0h4L11 14H7z" />
              <path d="M14 14L20 0h2L16 14h-2z" />
            </svg>
          </span>
          Grid Walk
        </div>
        <div className="gw-topbar-right">
          <button type="button" className="gw-about-link" onClick={() => router.push("/about")}>
            About
          </button>
          <SeasonSelector initialSeason={season} />
        </div>
      </div>

      <div className={"gw-jumpbar" + (diving ? " gw-hide" : "")}>
        <span className="gw-jumpbar-label">Jump to</span>
        <div className="gw-jumpbar-pills">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className="gw-jump-pill"
              onClick={() => travelTo(section.x, section.y)}
            >
              {section.title}
            </button>
          ))}
          <button type="button" className="gw-jump-pill gw-jump-reset" onClick={() => travelTo(0, 0)}>
            <span className="gw-reset-dot" aria-hidden="true" />
            Reset view
          </button>
        </div>
      </div>
    </div>
  );
}
