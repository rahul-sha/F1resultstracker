"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./gridwalk.css";
import { ResultsIcon, PositionsIcon, AboutIcon } from "@/components/nav-icons";
import SeasonSelector from "@/components/SeasonSelector";

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
}

type PinDef = {
  x: number;
  y: number;
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  miniStats?: GridWalkMiniStat[];
};

const SPHERE_R = 760;
const YAW_K = 0.062;
const PITCH_K = 0.05;
const ZOOM = 2.0;
const BOUND_YAW = 52;
const BOUND_PITCH = 27;
const DRAG_THRESHOLD = 6; // px of movement before a pointerdown counts as a drag, not a click
const TRAVEL_EASE = 0.12; // per-frame lerp factor for the "jump to" camera travel

function clamp(v: number, b: number) {
  return Math.max(-b, Math.min(b, v));
}

// "Inside a sphere" CSS-3D navigation: every pin sits on the sphere's
// surface via translateZ(-SPHERE_R) (negative — the camera is at the
// centre looking out, so content recedes into the screen rather than
// popping toward the viewer), and dragging rotates the whole rig the
// opposite way so content appears to follow the cursor. Getting the signs
// right here took real derivation — see memory "3d-mockup-exploration"
// before touching either the translateZ sign or the drag-direction math,
// since flipping one silently flips the other's apparent effect too.
export default function GridWalk({
  season,
  driverLeader,
  constructorLeader,
  podiumLeader,
  topDrivers,
  topPodiumDrivers,
}: GridWalkProps) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const distortRef = useRef<HTMLDivElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);

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
  // Set by the "jump to" bar; the animate loop eases the camera toward it
  // and clears it once close, so a drag can always interrupt a travel.
  const travelTarget = useRef<{ yaw: number; pitch: number } | null>(null);

  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  // x/y are yaw/pitch degrees on the sphere, not pixels — keep them well
  // apart (a few hundredths of a degree per screen pixel at this distance
  // means pin positions need real angular separation, not small offsets).
  const pins: PinDef[] = [
    {
      x: -40,
      y: -8,
      href: "/results",
      title: "Results",
      desc: "Points per Grand Prix, heatmapped across the season.",
      icon: <ResultsIcon size={20} />,
      miniStats: topDrivers,
    },
    {
      x: 0,
      y: 16,
      href: "/positions",
      title: "Positions",
      desc: "Finishing and qualifying positions, driver by driver.",
      icon: <PositionsIcon size={20} />,
      miniStats: topPodiumDrivers,
    },
    {
      x: 40,
      y: -6,
      href: "/about",
      title: "About",
      desc: "Who built this, how, and who it's built on.",
      icon: <AboutIcon size={20} />,
    },
  ];

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
      // so a pin's own onClick never fires. The drag already keeps working
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
  }, []);

  // x/y here are the pin's own yaw/pitch degrees on the sphere — unlike
  // the YAW_K/PITCH_K constants above, which only convert a drag's pixel
  // delta into a camera-rotation degree, placement needs real angular
  // separation (a few degrees of yaw at this translateZ puts two pins
  // almost exactly on top of each other on screen).
  function placeStyle(yawDeg: number, pitchDeg: number, extraZ = 0): React.CSSProperties {
    return {
      transform: `translate(-50%, -50%) rotateY(${yawDeg}deg) rotateX(${-pitchDeg}deg) translateZ(${-(SPHERE_R + extraZ)}px)`,
    };
  }

  function handlePinClick(href: string) {
    if (dragMoved.current) return; // a drag release, not a click
    router.push(href);
  }

  const stats: { x: number; y: number; stat: GridWalkStat | null }[] = [
    { x: -20, y: 22, stat: driverLeader },
    { x: 20, y: 22, stat: constructorLeader },
    { x: 0, y: -20, stat: podiumLeader },
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
          <div className="gw-headline" style={placeStyle(0, 0)}>
            <h1>F1 Results Tracker</h1>
            <p>{season} season — drag to look around, click a card to open it.</p>
          </div>

          {pins.map((pin) => (
            <div
              key={pin.href}
              className="gw-pin"
              style={placeStyle(pin.x, pin.y)}
              onClick={() => handlePinClick(pin.href)}
              onPointerEnter={() => setHoveredHref(pin.href)}
              onPointerLeave={() => setHoveredHref((cur) => (cur === pin.href ? null : cur))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") router.push(pin.href);
              }}
            >
              <span className="gw-pin-icon">{pin.icon}</span>
              <h2>{pin.title}</h2>
              <p>{pin.desc}</p>
            </div>
          ))}

          {pins.map(
            (pin) =>
              pin.miniStats &&
              pin.miniStats.length > 0 &&
              pin.miniStats.map((mini, i) => {
                // Small spread so the chips cluster tight around their own
                // card — these are degrees of angular separation on the
                // sphere, same units as pin.x/pin.y, not pixels. The
                // original 11°/13° offsets were close to the 40° gap
                // between cards, so chips landed near a neighbouring card
                // (or off past it) instead of hugging the hovered one.
                const spread = (i - (pin.miniStats!.length - 1) / 2) * 5;
                return (
                  <div
                    key={pin.href + mini.code}
                    className={"gw-mini-chip" + (hoveredHref === pin.href ? " show" : "")}
                    style={placeStyle(pin.x + spread, pin.y - 9 - (i % 2) * 5, -18)}
                    aria-hidden={hoveredHref !== pin.href}
                  >
                    <span className="gw-mini-chip-code">{mini.code}</span> {mini.value}
                  </div>
                );
              })
          )}

          {stats.map(
            ({ x, y, stat }, i) =>
              stat && (
                <div key={i} className="gw-chip" style={placeStyle(x, y, -40)}>
                  {stat.label}: {stat.value}
                </div>
              )
          )}
        </div>
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
          Grid Walk
        </div>
        <SeasonSelector initialSeason={season} />
      </div>

      <div className="gw-jumpbar">
        <span className="gw-jumpbar-label">Jump to</span>
        <div className="gw-jumpbar-pills">
          {pins.map((pin) => (
            <button key={pin.href} type="button" className="gw-jump-pill" onClick={() => travelTo(pin.x, pin.y)}>
              {pin.title}
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
