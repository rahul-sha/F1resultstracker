"use client";

import { useEffect, useRef } from "react";
import { createLiveGrid } from "./liveGrid";
import "./gridwalk.css";

// The same cursor-reactive grid that sits behind Grid Walk's carousel,
// reused on static pages (About) that have no camera of their own — drawn
// with a fixed { k: 1, tx: 0, ty: 0 } view instead of GridWalk's live one.
export default function LiveGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const grid = createLiveGrid(canvas);
    let raf = requestAnimationFrame(tick);
    function tick(now: number) {
      grid.draw(now, { k: 1, tx: 0, ty: 0 });
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      grid.destroy();
    };
  }, []);

  return <canvas className="gw-grid live-grid-fixed" ref={canvasRef} aria-hidden="true" />;
}
