"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

// Nav order from NavBar.tsx's NAV_TABS — kept in sync by hand since it's
// only three fixed routes.
const NAV_ORDER = ["/results", "/positions", "/about"];

const THRESHOLD = 90; // px of held overscroll before it springs forward
const MIN_HOLD_MS = 260; // must stay in overscroll this long — filters a single stray flick
const MAX_PULL = 110;

// Keep pulling past the bottom of the page and it springs to the next page
// in nav order. Deliberately needs a sustained pull past a real threshold
// (not just any overscroll) so an ordinary "scrolled a touch too far"
// trackpad flick does nothing — Rahul asked to keep this gentle after an
// earlier page-switch animation (PR #34) felt jumpy. The footer is still
// reached the normal way: nothing fires until the page is already fully
// scrolled, so scrolling to read the footer is unaffected.
export default function PageSpring() {
  const pathname = usePathname();
  const router = useRouter();
  const onHome = pathname === "/";
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const chipRef = useRef<HTMLSpanElement | null>(null);
  const pull = useRef(0);
  const pullStartedAt = useRef<number | null>(null);
  const firing = useRef(false);
  const decayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Grid Walk's home page has nothing to scroll and no next page in
    // NAV_ORDER — without this, a wheel/touch gesture over it can still
    // read as "pulled past the bottom" and show the spring indicator.
    if (onHome) return;

    function nextPath() {
      const idx = NAV_ORDER.indexOf(pathname);
      if (idx === -1) return null;
      return NAV_ORDER[(idx + 1) % NAV_ORDER.length];
    }

    function atBottom() {
      return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    }

    function clearDecay() {
      if (decayTimer.current !== null) {
        clearInterval(decayTimer.current);
        decayTimer.current = null;
      }
    }

    function setPull(value: number) {
      pull.current = Math.max(0, Math.min(MAX_PULL, value));
      const indicator = indicatorRef.current;
      const chip = chipRef.current;
      if (indicator) indicator.style.height = `${pull.current}px`;
      if (chip) chip.classList.toggle("show", pull.current > 16);
    }

    function decay() {
      if (decayTimer.current !== null) return;
      decayTimer.current = setInterval(() => {
        setPull(pull.current - 12);
        if (pull.current <= 0) {
          clearDecay();
          pullStartedAt.current = null;
        }
      }, 16);
    }

    function fire() {
      const target = nextPath();
      if (!target || firing.current) return;
      firing.current = true;
      router.push(target);
      window.setTimeout(() => {
        setPull(0);
        firing.current = false;
        pullStartedAt.current = null;
      }, 420);
    }

    function registerPull(delta: number) {
      clearDecay();
      if (pullStartedAt.current === null) pullStartedAt.current = Date.now();
      setPull(pull.current + delta);
      const held = Date.now() - pullStartedAt.current;
      if (pull.current >= THRESHOLD && held >= MIN_HOLD_MS) fire();
    }

    function handleWheel(e: WheelEvent) {
      if (firing.current) return;
      if (atBottom() && e.deltaY > 0) {
        e.preventDefault();
        registerPull(e.deltaY * 0.4);
      } else if (pull.current > 0) {
        decay();
      }
    }

    let touchStartY: number | null = null;
    function handleTouchStart(e: TouchEvent) {
      touchStartY = e.touches[0]?.clientY ?? null;
    }
    function handleTouchMove(e: TouchEvent) {
      if (firing.current || touchStartY === null) return;
      if (!atBottom()) return;
      const dy = touchStartY - (e.touches[0]?.clientY ?? touchStartY);
      if (dy > 0) registerPull(dy - pull.current);
    }
    function handleTouchEnd() {
      touchStartY = null;
      if (!firing.current) decay();
    }
    function handleScroll() {
      if (!atBottom() && pull.current > 0 && !firing.current) decay();
    }

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("scroll", handleScroll);
      clearDecay();
      setPull(0);
    };
  }, [pathname, router, onHome]);

  return (
    <div className="page-spring-indicator" ref={indicatorRef} aria-hidden="true">
      <span className="page-spring-chip" ref={chipRef}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}
