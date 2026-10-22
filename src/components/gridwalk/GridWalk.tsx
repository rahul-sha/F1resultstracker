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
const TRAVEL_EASE = 0.12; // per-frame lerp factor for both the camera travel and the dive zoom — one shared rate so rotating toward a card and zooming into it read as the one camera move, not two
// Each card's DOM is laid out at ITS OWN natural w/h always (section.w/h
// below — not forced square, so a wide heatmap and a compact bar chart
// keep their own real proportions) — see the .gw-card rule's comment.
// previewScale shrinks that down to a sphere-card-sized footprint at
// rest: scaled so every card is about the same WIDTH at rest, with
// height varying by its own aspect ratio.
const PREVIEW_TARGET_W = 190;

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
// out at a fixed natural size (section.w x section.h). At rest that's
// shown shrunk via a scale() folded into the card's sphere-placement
// transform.
//
// Round 4 reparented the clicked card to <body> and FLIPped it full
// screen while the rest of the scene sat still (blurred/dimmed) — visibly
// calm, but structurally still "one thing animates while the world
// freezes", which Rahul correctly kept reading as "another object, a
// separate animation" even after that round's own timing fix, once he
// shared his actual reference: a Miro board, panned and zoomed with
// Miro's own single camera, where the WHOLE canvas — the frame you're
// zooming into and its neighbours alike — scales together.
//
// Round 5 (this version) removes the FLIP/reparenting entirely. There is
// exactly one camera, used for both "jump to" and diving: rotate the rig
// toward a card (travelTo, unchanged) and, separately, scale
// the whole already-PROJECTED 2D picture — a plain scale() on gw-stage,
// outside and after the 3D sphere, around wherever the card actually
// lands (see measureCenteredRect/applyZoom2d below). No card ever leaves
// the rig or animates on its own; every pixel, target card and
// neighbours alike, grows by the same factor, exactly like Miro's own
// flat-canvas zoom. A translateZ "dolly" on the 3D rig itself was tried
// first and rejected: on a sphere, the card dead centre in view is
// actually the DEEPEST point once you've rotated to face it, so a shared
// depth shift grows the shallower neighbour cards toward the edge of
// frame faster than the one you clicked. See "grid-walk-round5-mockup"
// memory for the full diagnosis and the mockup this was ported from.
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
  const backBtnRef = useRef<HTMLButtonElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);

  // Each card's real, unscaled content size — measured via
  // offsetWidth/offsetHeight (layout-only, unaffected by the scale() a
  // card's rest/dive transform carries) rather than taken from a
  // design-time constant, so a card's rest-preview size and its dive's
  // full-size target both come from what the card actually rendered.
  // State, not a ref: cardRestTransform reads it during render to build
  // each card's inline style, and a ref isn't safe to read there.
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
  // Set by the "jump to" bar and by diving into a card; the animate loop
  // eases the camera toward it and clears it once close, so a drag can
  // always interrupt a travel.
  const travelTarget = useRef<{ yaw: number; pitch: number } | null>(null);

  // The zoom half of a dive, applied to gw-stage — a plain 2D scale()
  // around wherever the card actually lands, OUTSIDE the 3D sphere
  // entirely (see the top-of-file comment). zoomOriginX/Y aren't a
  // hardcoded viewport-centre, even though rotating the camera to a
  // card's (x, y) is SUPPOSED to put it exactly there: the card's own
  // translate(-50%, -50%) recentring is sandwiched inside its transform
  // chain, ahead of the rig's rotation — so the rig's rotation also
  // rotates that (fixed, axis-aligned) offset, landing the card a few
  // hundred pixels off true centre. zoomPivotK is the dive's target zoom
  // (fixed for the whole dive, in and out); applyZoom2d pans and grows at
  // once so the measured point slides to the viewport's true centre
  // exactly as the zoom completes.
  const zoom2d = useRef(1);
  const zoom2dTarget = useRef<number | null>(null);
  const zoom2dOnSettleRef = useRef<(() => void) | null>(null);
  const zoomOriginX = useRef<number | null>(null);
  const zoomOriginY = useRef<number | null>(null);
  const zoomPivotK = useRef<number | null>(null);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const diving = activeId !== null;

  // x/y place each card on an 8-point ring (45° apart, clockwise from the
  // top), in the same order as the jump bar below — so looking around the
  // sphere clockwise matches clicking through the jump pills left to right.
  const sections: SectionDef[] = [
    {
      id: "results",
      x: 0,
      y: 24,
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
      x: 30,
      y: 17,
      z: 0,
      eyebrow: "/results",
      tabColor: "#ff8000",
      title: "Constructors",
      stat: constructorLeader?.value.split(" — ")[1] ?? "—",
      statLabel: constructorLeader?.value.split(" — ")[0] ?? "Leading team",
      renderFull: () => <ConstructorPointsHeatmap grid={constructorGrid} />,
    },
    {
      id: "evolution",
      x: 42,
      y: 0,
      z: 0,
      eyebrow: "/results",
      tabColor: "#66d9ef",
      title: "Points Evolution",
      stat: `${pointsGrid.rows.length}`,
      statLabel: "drivers tracked",
      renderFull: () => <DriverPointsEvolutionChart grid={pointsGrid} />,
    },
    {
      id: "positions",
      x: 30,
      y: -17,
      z: 0,
      eyebrow: "/positions",
      tabColor: "#3671c6",
      title: "Positions",
      stat: `${finishSummary.maxPosition}`,
      statLabel: "grid slots tracked",
      renderFull: () => <PointsHeatmap grid={pointsGrid} mode="position" />,
    },
    {
      id: "finishfreq",
      x: 0,
      y: -24,
      z: 0,
      eyebrow: "/positions",
      tabColor: "#3671c6",
      title: "Finish Frequency",
      stat: `${finishSummary.drivers.length}`,
      statLabel: "drivers tracked",
      renderFull: () => <FinishPositionsGrid summary={finishSummary} />,
    },
    {
      id: "qualifreq",
      x: -30,
      y: -17,
      z: 0,
      eyebrow: "/positions",
      tabColor: "#00d2be",
      title: "Qualifying Frequency",
      stat: `${qualifyingSummary.maxPosition}`,
      statLabel: "grid slots tracked",
      renderFull: () => <QualifyingPositionsGrid summary={qualifyingSummary} />,
    },
    {
      id: "podiumsD",
      x: -42,
      y: 0,
      z: 0,
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
      x: -30,
      y: 17,
      z: 0,
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

  // Measures every card's real natural size after each render. Runs with
  // no dependency array (every commit), but only re-renders when a
  // measurement actually changed, so it settles after at most one extra
  // pass once a season's content is stable. useLayoutEffect (not
  // useEffect) so the very first measurement — and the re-render it
  // triggers to apply the correct previewScale — both happen before the
  // browser paints, with no flash of unscaled, full-size cards.
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

  // The zoom half of a dive — see the zoom2d refs' comment above. Not a
  // plain scale() around a fixed point: that would either leave the card
  // stranded wherever it happened to land (pivot = the card's own point)
  // or push it further off-centre as it grows (pivot = viewport centre).
  // frac is "how far into this dive's zoom" zoom2d currently is (0 at
  // rest, 1 fully dived in); the pan is frac's share of the full pan this
  // zoom needs — zero at rest, exactly centred at full zoom.
  function applyZoom2d() {
    const stage = stageRef.current;
    if (!stage) return;
    if (zoomOriginX.current === null || zoomOriginY.current === null || zoomPivotK.current === null) {
      stage.style.transform = zoom2d.current === 1 ? "" : `scale(${zoom2d.current.toFixed(4)})`;
      return;
    }
    const frac = (zoom2d.current - 1) / (zoomPivotK.current - 1);
    const tx = frac * (window.innerWidth / 2 - zoomPivotK.current * zoomOriginX.current);
    const ty = frac * (window.innerHeight / 2 - zoomPivotK.current * zoomOriginY.current);
    stage.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${zoom2d.current.toFixed(4)})`;
  }

  // Renders a card's own centring rotation for one synchronous frame,
  // reads its actual on-screen rect, then puts the camera back exactly as
  // it was — never visible, since it resolves before the browser paints.
  // Also zeroes gw-stage's own transform for that one frame: the math
  // above always assumes this rect is the card's COLD (zoom2d===1) size,
  // which only holds if whatever zoom is already mid-flight is stripped
  // out first — matters once diveInto can retarget a second card while
  // still zoomed into the first (see diveInto).
  function measureCenteredRect(section: SectionDef) {
    const rig = rigRef.current;
    const stage = stageRef.current;
    const el = cardRefs.current[section.id];
    if (!rig || !stage || !el) return null;
    const savedStage = stage.style.transform;
    rig.style.transition = "none";
    rig.style.transform = `scale(${ZOOM}) rotateX(${section.y}deg) rotateY(${-section.x}deg)`;
    stage.style.transform = "";
    const rect = el.getBoundingClientRect();
    applyCamera();
    stage.style.transform = savedStage;
    rig.style.transition = "";
    return rect;
  }

  // Lets go of "focused on one card" without touching the zoom at all —
  // called the moment a drag turns into a real move while diving (see
  // onPointerMove below). Camera rotation keeps running under the still-
  // zoomed stage exactly as it would at rest, which is what produces the
  // "pan around a zoomed-in canvas" feel: rotation and the flat zoom were
  // always two independent layers, so releasing focus needs no new math,
  // just un-dimming the other cards and dropping which one is "active".
  // syncChrome (driven off the zoom level, not activeId) keeps the Back
  // button and headline/brand correct through this.
  function releaseFocus() {
    setActiveId(null);
  }

  // Back button and headline/brand used to be toggled once, keyed off
  // activeId/diving. Now that releaseFocus can clear activeId while
  // staying zoomed in, that chrome has to track the actual zoom level
  // continuously instead — called every tick from animate(). Written as a
  // direct DOM write (like applyCamera/applyZoom2d above), not React
  // state, so it costs nothing to run every frame.
  function syncChrome() {
    const zoomed = zoom2d.current > 1.01 || zoom2dTarget.current !== null;
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

    function onPointerDown(e: PointerEvent) {
      // Used to bail out entirely while diving — the camera was "inside"
      // a focused card, not free to pan. Now that diving is just "the
      // same canvas, zoomed in," a drag is always allowed to start; if it
      // turns into a real move, onPointerMove's releaseFocus() call below
      // lets go of "focused" while leaving the zoom exactly where it is.
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
      if (!dragMoved.current && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        dragMoved.current = true;
        if (diving) releaseFocus();
      }

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

        if (zoom2dTarget.current !== null) {
          zoom2d.current += (zoom2dTarget.current - zoom2d.current) * TRAVEL_EASE;
          if (Math.abs(zoom2dTarget.current - zoom2d.current) < 0.004) {
            zoom2d.current = zoom2dTarget.current;
            zoom2dTarget.current = null;
            // Fires exactly when the zoom actually finishes easing, not
            // after some guessed duration — a fixed timeout here could
            // clear the pivot before a slower run of this loop had really
            // reached it, dropping the pan mid-flight.
            const cb = zoom2dOnSettleRef.current;
            zoom2dOnSettleRef.current = null;
            if (cb) cb();
          }
          applyZoom2d();
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

  // Same sphere placement as placeStyle, but with this card's own
  // previewScale folded in as part of the same transform — this is the
  // only thing that makes a card's always-full-size content look small
  // at rest. previewScale targets the same rest WIDTH (PREVIEW_TARGET_W)
  // for every card, off its MEASURED natural width (naturalSizes, set by
  // the useLayoutEffect above), so height varies with each card's own
  // real aspect ratio instead of every card being forced square — and a
  // 24-round heatmap keeps its true width instead of being squeezed to
  // fit. Before the first measurement lands, naturalW falls back to
  // PREVIEW_TARGET_W (previewScale 1) — harmless, since useLayoutEffect
  // corrects it before the browser ever paints the unscaled size.
  function cardRestTransform(section: SectionDef): string {
    const naturalW = naturalSizes[section.id]?.w ?? PREVIEW_TARGET_W;
    const previewScale = PREVIEW_TARGET_W / naturalW;
    return `translate(-50%, -50%) rotateY(${section.x}deg) rotateX(${-section.y}deg) translateZ(${-(SPHERE_R + section.z)}px) scale(${previewScale})`;
  }

  function cardPlaceStyle(section: SectionDef): React.CSSProperties {
    return { transform: cardRestTransform(section) };
  }

  // Dive-in / dive-out. There is no FLIP and no reparenting: diving sets
  // the normal rotation travelTarget (exactly what "jump to" sets) and a
  // zoom2dTarget (see applyZoom2d/measureCenteredRect above), and the one
  // shared animate loop eases both — so pointing the camera at a card and
  // zooming into it are the same camera move, converging together. The
  // bar at the bottom stays usable mid-dive: clicking a different jump
  // pill or card calls this again to retarget straight to it, without a
  // dive-out step first.
  // Zooms to the card's own natural size — no viewport-fit cap, so a
  // 24-round heatmap can end up wider than the screen (panning, not
  // shrinking, is how the rest of it gets reached; see releaseFocus
  // below). zoom2dTarget is NOT a flat PREVIEW_TARGET_W/naturalW inverse:
  // that only undoes the CSS scale() previewScale applied. centeredRect
  // (measured "cold", at zoom2d===1) also already carries this card's own
  // 3D-perspective keystone — an off-centre card's "centred" bounding box
  // is the AABB of a slightly skewed quad, not a clean uniform scale of
  // its natural box, so its width and height ratios to natural size
  // disagree. There's no single scale factor that undoes a skew exactly,
  // so this takes the geometric mean of the two axis ratios as the one
  // number the flat 2D zoom() can use — close to true natural size for a
  // near-centre card, still "full, readable size" rather than noticeably
  // stretched for one further round the sphere.
  function diveInto(section: SectionDef) {
    if (dragMoved.current) return;
    if (diving && activeId === section.id) return;

    const centeredRect = measureCenteredRect(section);
    if (!centeredRect) return;
    zoomOriginX.current = centeredRect.left + centeredRect.width / 2;
    zoomOriginY.current = centeredRect.top + centeredRect.height / 2;

    const natural = naturalSizes[section.id];
    const naturalW = natural?.w ?? centeredRect.width;
    const naturalH = natural?.h ?? centeredRect.height;
    const wRatio = naturalW / centeredRect.width;
    const hRatio = naturalH / centeredRect.height;
    const target = Math.sqrt(wRatio * hRatio);
    zoom2dTarget.current = target;
    zoomPivotK.current = target;

    travelTo(section.x, section.y);
    setActiveId(section.id);
  }

  function diveOut() {
    if (zoom2d.current <= 1.001 && zoom2dTarget.current === null) return;
    // Only the flat zoom reverses — the rotation stays exactly where it
    // is, so the sphere settles back to the same place the card was
    // dived into from, the same way "jump to" leaves the camera wherever
    // it last pointed.
    zoom2dTarget.current = 1;
    zoom2dOnSettleRef.current = () => {
      zoomOriginX.current = null;
      zoomOriginY.current = null;
      zoomPivotK.current = null;
      setActiveId(null);
    };
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
                // Applied for the whole dive, so the active card can't be
                // clicked/hovered again while that's in progress. Every
                // other card gets gw-faded instead — dimmed so attention
                // stays on the target, but still visible and still
                // growing/sliding with the same camera move, never hidden
                // or removed, exactly like an unfocused Miro frame
                // receding as you zoom into its neighbour.
                (section.id === activeId ? " gw-card-inert" : "") +
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
        </div>
      </div>

      <button
        type="button"
        className="gw-back-btn"
        ref={backBtnRef}
        onClick={diveOut}
        aria-label="Back to Grid Walk"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      {/* Stays on screen through a dive — the card zooms in behind it,
          never over it, and the theme toggle (the only place to reach it
          on this page, since NavBar hides itself on "/") needs to stay
          reachable the whole time. Just the brand mark hides while diving
          — the Back button sits in the same top-left corner and would
          otherwise overlap it. The Back button, brand and headline are
          all kept in sync with the current zoom level by syncChrome(),
          called every tick, rather than by activeId/diving here — a dive
          can release its "focused card" while staying zoomed in (see
          releaseFocus), and this chrome needs to track the zoom, not
          that. */}
      <div className="gw-topbar">
        <div className="gw-brand" ref={brandRef}>
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
          <ThemeToggle iconOnly />
          <AccentToggle iconOnly />
          <SeasonSelector initialSeason={season} />
        </div>
      </div>

      {/* Also stays visible and usable through a dive: clicking another
          pill (or Reset) retargets straight to it/out without needing
          Back first — see diveInto/diveOut. */}
      <div className="gw-jumpbar">
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
          <button
            type="button"
            className="gw-jump-pill gw-jump-reset"
            onClick={() => (zoom2d.current > 1.001 || zoom2dTarget.current !== null ? diveOut() : travelTo(0, 0))}
          >
            <span className="gw-reset-dot" aria-hidden="true" />
            Reset view
          </button>
        </div>
      </div>
    </div>
  );
}
