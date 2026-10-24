"use client";

import { useEffect, useRef } from "react";
import Pill from "./Pill";

interface TabStripProps {
  items: string[];
  active: number;
  onSelect: (index: number) => void;
  className?: string;
}

// TabStrip: a scrolling row of tab pills where the open tab rests at the
// left edge. Three ways to browse, all ending in onSelect:
//   - tap or click a tab;
//   - swipe (phone) or hold-and-drag with a mouse (desktop), then let go:
//     the strip snaps, and whichever tab comes to rest at the left opens;
//   - wheel or trackpad scroll over the strip: one tab per notch.
// Code moves the strip when `active` changes; a strip moving by hand is
// left alone until it settles. The strip's padding and fade-out are set
// by the caller, since they depend on where it sits.
export default function TabStrip({ items, active, onSelect, className }: TabStripProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  // Whether the current scroll was started by code rather than by hand.
  const programmatic = useRef(false);
  // The strip is moving by hand: "finger" while touched, "coasting" after
  // release until it comes to rest.
  const held = useRef<"finger" | "coasting" | null>(null);
  const settleTimer = useRef(0);
  // Set after a mouse drag, so the release doesn't also count as a click
  // on whichever tab was under the pointer.
  const dragged = useRef(false);
  // Latest props for the listeners registered once below.
  const activeRef = useRef(active);
  const selectRef = useRef(onSelect);
  const countRef = useRef(items.length);
  useEffect(() => {
    activeRef.current = active;
    selectRef.current = onSelect;
    countRef.current = items.length;
  });

  // Rest the open tab at the left edge, when the strip is visible and not
  // in someone's hand.
  useEffect(() => {
    const track = trackRef.current;
    const tab = track?.children[active] as HTMLElement | undefined;
    if (!track || !tab || !track.offsetParent || held.current) return;
    const left = tab.offsetLeft - track.offsetLeft;
    if (Math.abs(track.scrollLeft - left) < 1) return;
    programmatic.current = true;
    track.scrollTo({ left, behavior: "smooth" });
  }, [active]);

  // Once a scroll comes to rest, the tab sitting at the left opens.
  function settle() {
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      const track = trackRef.current;
      if (!track) return;
      if (held.current) {
        if (held.current === "finger") return;
        held.current = null;
      } else if (programmatic.current) {
        programmatic.current = false;
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
      // Always report, even if it's already the open tab: the view may only
      // be passing it on the way somewhere else.
      selectRef.current(best);
    }, 160);
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // A mouse can't scroll an overflowing strip by itself, so holding and
    // dragging scrolls it; on release it snaps and settles.
    let drag: { id: number; x: number; left: number; moved: boolean } | null = null;
    function onDown(e: PointerEvent) {
      if (e.pointerType !== "mouse" || e.button !== 0 || !track) return;
      drag = { id: e.pointerId, x: e.clientX, left: track.scrollLeft, moved: false };
      programmatic.current = false;
    }
    function onMove(e: PointerEvent) {
      if (!drag || e.pointerId !== drag.id || !track) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 4) {
        drag.moved = true;
        dragged.current = true;
        track.classList.add("dragging");
      }
      if (drag.moved) track.scrollLeft = drag.left - dx;
    }
    function onUp(e: PointerEvent) {
      if (!drag || e.pointerId !== drag.id || !track) return;
      const wasMoved = drag.moved;
      drag = null;
      if (!wasMoved) return;
      track.classList.remove("dragging");
      window.setTimeout(() => {
        dragged.current = false;
      }, 0);
    }

    // Wheel or trackpad scrolling steps one tab at a time, either
    // direction, so you can always get back from the last tab.
    let wheel = 0;
    let wheelAt = 0;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      const d = (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * unit;
      const now = Date.now();
      if (now - wheelAt > 300) wheel = 0;
      wheel += d;
      if (Math.abs(wheel) < 40 || now - wheelAt < 260) return;
      wheelAt = now;
      const step = wheel > 0 ? 1 : -1;
      wheel = 0;
      selectRef.current(Math.max(0, Math.min(countRef.current - 1, activeRef.current + step)));
    }

    track.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    track.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      track.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      track.removeEventListener("wheel", onWheel);
      window.clearTimeout(settleTimer.current);
    };
  }, []);

  return (
    <div
      className={"ui-tab-strip" + (className ? " " + className : "")}
      ref={trackRef}
      onScroll={settle}
      // A finger on the strip takes over from any glide still running, and
      // the strip settles only once it's lifted. Touch events, as pointer
      // events are cancelled as soon as the strip starts to pan.
      onTouchStart={() => {
        programmatic.current = false;
        held.current = "finger";
      }}
      onTouchEnd={(e) => {
        if (e.touches.length) return;
        held.current = "coasting";
        settle();
      }}
      onTouchCancel={() => {
        held.current = "coasting";
        settle();
      }}
    >
      {items.map((label, i) => (
        <Pill
          key={label}
          active={i === active}
          aria-current={i === active ? "true" : undefined}
          onClick={() => {
            // A release after a drag isn't a click; a tap wins over a
            // settle still pending from a swipe; the browser nudging the
            // tapped tab into view isn't a swipe either.
            if (dragged.current) return;
            window.clearTimeout(settleTimer.current);
            programmatic.current = true;
            held.current = null;
            onSelect(i);
          }}
        >
          {label}
        </Pill>
      ))}
    </div>
  );
}
