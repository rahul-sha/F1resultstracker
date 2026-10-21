"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import "./gridwalk.css";
import { ResultsIcon, PositionsIcon, AboutIcon } from "@/components/nav-icons";

export interface GridWalkStat {
  label: string;
  value: string;
}

export interface GridWalkProps {
  season: number;
  driverLeader: GridWalkStat | null;
  constructorLeader: GridWalkStat | null;
  podiumLeader: GridWalkStat | null;
}

type PinDef = {
  x: number;
  y: number;
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  rotate?: number;
};

const SPHERE_R = 760;
const YAW_K = 0.062;
const PITCH_K = 0.05;
const ZOOM = 2.0;
const BOUND_YAW = 52;
const BOUND_PITCH = 27;
const DRAG_THRESHOLD = 6; // px of movement before a pointerdown counts as a drag, not a click

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
export default function GridWalk({ season, driverLeader, constructorLeader, podiumLeader }: GridWalkProps) {
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

  const pins: PinDef[] = [
    { x: -32, y: -8, href: "/results", title: "Results", desc: "Points per Grand Prix, heatmapped across the season.", icon: <ResultsIcon size={20} /> },
    { x: 0, y: 14, href: "/positions", title: "Positions", desc: "Finishing and qualifying positions, driver by driver.", icon: <PositionsIcon size={20} /> },
    { x: 32, y: -6, href: "/about", title: "About", desc: "Who built this, how, and who it's built on.", icon: <AboutIcon size={20} /> },
  ];

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
      startX.current = e.clientX;
      startY.current = e.clientY;
      startYaw.current = camYaw.current;
      startPitch.current = camPitch.current;
      vYaw.current = 0;
      vPitch.current = 0;
      wrap!.classList.add("dragging");
      wrap!.setPointerCapture(e.pointerId);
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

    function onPointerUp(e: PointerEvent) {
      dragging.current = false;
      wrap!.classList.remove("dragging");
      try {
        wrap!.releasePointerCapture(e.pointerId);
      } catch {
        // already released
      }
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
        camYaw.current = clamp(camYaw.current + vYaw.current, BOUND_YAW);
        camPitch.current = clamp(camPitch.current + vPitch.current, BOUND_PITCH);
        vYaw.current *= 0.92;
        vPitch.current *= 0.92;
        if (Math.abs(vYaw.current) > 0.001 || Math.abs(vPitch.current) > 0.001) applyCamera();
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

  function placeStyle(x: number, y: number, extraZ = 0): React.CSSProperties {
    const yaw = x * YAW_K;
    const pitch = y * PITCH_K;
    return {
      transform: `translate(-50%, -50%) rotateY(${yaw}deg) rotateX(${-pitch}deg) translateZ(${-(SPHERE_R + extraZ)}px)`,
    };
  }

  function handlePinClick(href: string) {
    if (dragMoved.current) return; // a drag release, not a click
    router.push(href);
  }

  const stats: { x: number; y: number; stat: GridWalkStat | null }[] = [
    { x: -14, y: 30, stat: driverLeader },
    { x: 14, y: 32, stat: constructorLeader },
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
          <div className="gw-headline" style={placeStyle(0, 0)}>
            <h1>F1 Results Tracker</h1>
            <p>{season} season — drag to look around, click a card to open it.</p>
          </div>

          {pins.map((pin) => (
            <div
              key={pin.href}
              className="gw-pin"
              style={placeStyle(pin.x, pin.y, pin.rotate ?? 0)}
              onClick={() => handlePinClick(pin.href)}
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

      <div className="gw-hint">Click and drag to look around</div>
    </div>
  );
}
