"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./gridwalk.css";
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
// A card's DOM is laid out at this size always — see the .gw-card rule's
// comment. PREVIEW_SCALE is just what shrinks that natural size down to
// a sphere-card-sized footprint at rest.
const NATURAL_W = 720;
const NATURAL_H = 800;
const PREVIEW_SCALE = 190 / NATURAL_W;

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
// Diving into a card doesn't navigate to a new page, and it doesn't swap a
// small preview for a separate "full" element either — each card's DOM
// always contains its real content (the actual heatmap/chart/bars), laid
// out at a fixed natural size (NATURAL_W x NATURAL_H). At rest that's
// shown shrunk via a scale() folded into the card's sphere-placement
// transform; diving reparents the card to <body> (so it escapes the rig's
// own 3D transform, which would otherwise hijack position: fixed) and
// animates a FLIP transform (translate+scale only, computed from
// getBoundingClientRect — see diveInto/diveOut) from that resting size up
// to a near-fullscreen one. It's one continuous zoom of the same DOM
// node the whole time, never two distinct objects crossfading — see
// "grid-walk-8-section-redesign" memory for why the earlier box-morph
// overlay version read as "opening a new element" even after its own
// pop/timing bugs were fixed.
//
// The FLIP itself starts in the same tick as the click — there is no
// camera-travel-then-dive handoff. An earlier version rotated the camera
// toward the clicked card first and only started the FLIP once that
// settled, which Rahul (shown a Miro recording of zooming into a sticky
// note) correctly read as two animations, not one. diveInto now snaps
// the camera to the card's angle with no easing, purely so it's already
// facing the right way if the user dives back out — it has no visible
// effect, since the card is reparented out of the rig before the browser
// ever paints that frame. The FLIP transform also needs transform-origin
// pinned to the card's own top-left (see diveInto/diveOut) — with the
// CSS default (centre), translate+scale doesn't land the box at a given
// rect, which was a real, separate bug this surfaced.
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
  const stageRef = useRef<HTMLDivElement>(null);
  const distortRef = useRef<HTMLDivElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const restRectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  // While a card is reparented to <body> for its dive, this remembers
  // where it came from — both so diveOut can hand it back, and so a
  // cleanup effect can do the same if the component unmounts mid-dive
  // (otherwise React's own unmount would try to remove it from the rig,
  // where it no longer physically is, and throw).
  const reparented = useRef<{ el: HTMLDivElement; originalParent: HTMLElement } | null>(null);

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

  function travelTo(yaw: number, pitch: number) {
    travelTarget.current = { yaw: clamp(yaw, BOUND_YAW), pitch: clamp(pitch, BOUND_PITCH) };
    vYaw.current = 0;
    vPitch.current = 0;
  }

  // Snaps the camera straight to a card's angle, with no easing and no
  // visible transition. Used only so the sphere is already facing the
  // right way if the user dives back out — diveInto reparents the card
  // out of the rig before the browser paints the next frame, so this has
  // zero effect on the dive itself. Unlike travelTo, it doesn't animate,
  // which is the point: an eased camera move is what made diving read as
  // two animations instead of one.
  function snapCameraTo(yaw: number, pitch: number) {
    travelTarget.current = null;
    vYaw.current = 0;
    vPitch.current = 0;
    camYaw.current = clamp(yaw, BOUND_YAW);
    camPitch.current = clamp(pitch, BOUND_PITCH);
    if (rigRef.current) {
      rigRef.current.style.transform = `scale(${ZOOM}) rotateX(${camPitch.current}deg) rotateY(${-camYaw.current}deg)`;
    }
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

  // If the component unmounts mid-dive (e.g. a browser back navigation
  // while a card is reparented to <body>), hand the card back to the rig
  // first — otherwise React's own unmount would try to remove it from the
  // rig, where it no longer physically lives, and throw.
  useEffect(() => {
    return () => {
      const info = reparented.current;
      if (info) {
        info.originalParent.appendChild(info.el);
        reparented.current = null;
      }
    };
  }, []);

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

  // Same sphere placement as placeStyle, but with PREVIEW_SCALE folded in
  // as part of the same transform — this is the only thing that makes a
  // card's always-full-size content look small at rest. Kept as a
  // separate function (rather than an extra placeStyle param) because
  // this exact string, with this exact scale, is also what diveOut hands
  // the card back to when a dive finishes — see cardRestTransform below.
  function cardRestTransform(section: SectionDef): string {
    return `translate(-50%, -50%) rotateY(${section.x}deg) rotateX(${-section.y}deg) translateZ(${-(SPHERE_R + section.z)}px) scale(${PREVIEW_SCALE})`;
  }

  function cardPlaceStyle(section: SectionDef): React.CSSProperties {
    return { transform: cardRestTransform(section) };
  }

  function diveInto(section: SectionDef) {
    if (dragMoved.current || diving) return;
    setActiveId(section.id);

    const el = cardRefs.current[section.id];
    if (!el || !rigRef.current) return;

    // Measure the card at its current, still-on-the-sphere on-screen
    // rect ("First"), then reparent it to <body> at its real natural
    // size ("Last" — nothing about its own layout changes, only where
    // it lives in the DOM) and immediately apply a transform that makes
    // it visually occupy exactly the First rect ("Invert"), before a
    // single frame paints. Playing that transform back to identity is
    // the "Play" step below. This all happens synchronously, in the same
    // tick as the click — the camera reorients in the background via
    // snapCameraTo below, but nothing here waits on it.
    const firstRect = el.getBoundingClientRect();
    restRectRef.current = { left: firstRect.left, top: firstRect.top, width: firstRect.width, height: firstRect.height };

    snapCameraTo(section.x, section.y);

    reparented.current = { el, originalParent: rigRef.current };
    document.body.appendChild(el);
    el.style.transition = "none";
    el.style.position = "fixed";
    el.style.margin = "0";
    el.style.zIndex = "45";
    el.style.left = "0";
    el.style.top = "0";
    // translate+scale only places an element at a given rect when the
    // transform originates from its top-left corner — the CSS default is
    // the element's centre, which silently drifts the math by however far
    // off-centre the card is. Pin it for the whole dive.
    el.style.transformOrigin = "0 0";

    // Scale the card's own natural size to fit the viewport (never its
    // width/height — those stay NATURAL_W/NATURAL_H always), then
    // centre it. This is the only screen-size adaptation here, and it's
    // still one uniform scale, so zooming back out to wherever the card
    // sits at rest is one continuous transform the whole way, not two
    // different kinds of animation stitched together.
    const fitScale = Math.min(1, (window.innerWidth * 0.92) / NATURAL_W, (window.innerHeight * 0.9) / NATURAL_H);
    const targetW = NATURAL_W * fitScale;
    const targetH = NATURAL_H * fitScale;
    const targetL = (window.innerWidth - targetW) / 2;
    const targetT = (window.innerHeight - targetH) / 2;

    const scale = firstRect.width / NATURAL_W;
    el.style.transform = `translate(${firstRect.left.toFixed(1)}px, ${firstRect.top.toFixed(1)}px) scale(${scale.toFixed(4)})`;
    // Force layout/paint before the "Play" step below, or the browser
    // never registers this Invert transform as a starting point and the
    // transition animates from whatever the element's previous
    // transform was instead.
    void el.offsetHeight;

    stageRef.current?.classList.add("gw-dive-dim");

    el.style.transition = `transform ${DIVE_MS}ms ${DIVE_EASE}, border-color 0.15s ease`;
    el.style.transform = `translate(${targetL.toFixed(1)}px, ${targetT.toFixed(1)}px) scale(${fitScale.toFixed(4)})`;
  }

  function diveOut() {
    const info = reparented.current;
    const rect = restRectRef.current;
    if (!info || !rect) return;
    const { el, originalParent } = info;

    stageRef.current?.classList.remove("gw-dive-dim");

    const scale = rect.width / NATURAL_W;
    el.style.transition = `transform ${DIVE_MS}ms ${DIVE_EASE}, border-color 0.15s ease`;
    el.style.transform = `translate(${rect.left.toFixed(1)}px, ${rect.top.toFixed(1)}px) scale(${scale.toFixed(4)})`;

    window.setTimeout(() => {
      // Hand the card back to the rig at its usual sphere position. The
      // transform is set explicitly to the resting value (rather than
      // cleared to "") because React's own diff against this same style
      // prop sees no change across this render and won't reapply it
      // otherwise, leaving whatever we last set here in place.
      const section = sections.find((s) => s.id === activeId);
      el.style.transition = "none";
      el.style.position = "";
      el.style.margin = "";
      el.style.left = "";
      el.style.top = "";
      el.style.zIndex = "";
      el.style.transformOrigin = "";
      if (section) el.style.transform = cardRestTransform(section);
      originalParent.appendChild(el);
      reparented.current = null;
      restRectRef.current = null;
      setActiveId(null);
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

      <div className="gw-stage" ref={stageRef}>
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
                // Applied for the whole dive (both the camera-travel wait
                // and the grown view), so the active card can't be
                // clicked/hovered again while that's in progress.
                // Both classes last the whole dive. They're driven by
                // activeId (React-rendered) rather than toggled
                // imperatively in diveInto/diveOut, because an imperative
                // classList.add right before diveInto's reparent gets
                // wiped out by the re-render that setActiveId itself
                // schedules moments later — React overwrites className
                // wholesale on every render of this element.
                (section.id === activeId ? " gw-card-inert gw-card-diving" : "") +
                (diving && section.id !== activeId ? " gw-faded" : "")
              }
              style={cardPlaceStyle(section)}
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
              <div className="gw-card-inner">
                <div className="gw-card-eyebrow">
                  <span className="gw-card-eyebrow-dot" />
                  {section.eyebrow}
                </div>
                <h2>{section.title}</h2>
                <div className="gw-card-stat">
                  <b>{section.stat}</b> · {section.statLabel}
                </div>
                {section.renderFull()}
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
              onClick={() => diveInto(section)}
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
