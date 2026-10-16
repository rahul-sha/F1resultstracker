"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { availableSeasons } from "@/lib/seasons";

export default function SeasonSelector({ season }: { season: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const seasons = availableSeasons();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open]);

  function handleSelect(nextSeason: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("season", String(nextSeason));
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  return (
    <div className={"switcher" + (open ? " open" : "")} ref={rootRef}>
      <button
        type="button"
        className="switcher-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{season} season</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <div className="switcher-menu" role="listbox">
          {seasons.map((year) => (
            <button
              key={year}
              type="button"
              role="option"
              aria-selected={year === season}
              className={"switcher-option" + (year === season ? " active" : "")}
              onClick={() => handleSelect(year)}
            >
              {year} season
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
