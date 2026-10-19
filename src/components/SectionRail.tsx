"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type RailSection = { id: string; label: string };

// A trigger line near the top of the viewport — whichever section's top has
// most recently crossed above it is "current". This (rather than an
// IntersectionObserver's visibility ratio) is what stays correct when
// sections are very different heights: a short section lower on the page
// can sit entirely below a tall one's intersection area and never register.
const TRIGGER_Y = 140;

// A thin strip of ticks down the left edge, one per section on the current
// page, that highlights whichever section is in view as you scroll — a
// hint that there's more content below, without a second scrollbar (the
// page scrollbar itself is hidden; see globals.css).
//
// Only meaningful for a single sequential column of sections (Results,
// Positions) — About's two-column layout puts sections side by side, so
// "current section" doesn't track scroll position the same way; skip it
// there.
export default function SectionRail() {
  const pathname = usePathname();
  const [sections, setSections] = useState<RailSection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const onAbout = pathname.startsWith("/about");

  useEffect(() => {
    if (onAbout) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-rail-label]"));
    const list = els.map((el) => ({ id: el.id, label: el.dataset.railLabel ?? "" }));
    // Reads the sections straight from the rendered DOM, so there's no way
    // to know the list before mount — syncing it into state here is the
    // point, as with the theme/accent toggles' mount-detection effects.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSections(list);
    setActiveId(list[0]?.id ?? null);
    if (els.length < 2) return;

    let ticking = false;
    function updateActive() {
      ticking = false;
      // Near the bottom of a short page, the last section's own height can
      // be less than the gap still left to scroll, so its top never
      // reaches the trigger line even at max scroll — treat "scrolled to
      // the bottom" as "on the last section" rather than leaving the
      // previous one stuck active.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        setActiveId(els[els.length - 1]?.id ?? null);
        return;
      }
      let current = els[0]?.id ?? null;
      for (const el of els) {
        if (el.getBoundingClientRect().top <= TRIGGER_Y) current = el.id;
      }
      setActiveId(current);
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateActive);
    }

    updateActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname, onAbout]);

  if (onAbout || sections.length < 2) return null;

  function goTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="section-rail" aria-label="Page sections">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          className={"section-rail-tick" + (section.id === activeId ? " active" : "")}
          onClick={() => goTo(section.id)}
          aria-label={section.label}
          title={section.label}
        />
      ))}
    </nav>
  );
}
