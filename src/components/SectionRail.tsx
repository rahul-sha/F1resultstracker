"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type RailSection = { id: string; label: string };

// A thin strip of ticks down the left edge, one per section on the current
// page, that highlights whichever section is in view as you scroll — a
// hint that there's more content below, without a second scrollbar (the
// page scrollbar itself is hidden; see .page-shell in globals.css).
export default function SectionRail() {
  const pathname = usePathname();
  const [sections, setSections] = useState<RailSection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-rail-label]"));
    const list = els.map((el) => ({ id: el.id, label: el.dataset.railLabel ?? "" }));
    // Reads the sections straight from the rendered DOM, so there's no way
    // to know the list before mount — syncing it into state here is the
    // point, as with the theme/accent toggles' mount-detection effects.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSections(list);
    setActiveId(list[0]?.id ?? null);
    if (els.length < 2) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        visible.sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
        setActiveId(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  if (sections.length < 2) return null;

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
