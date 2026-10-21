"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { availableSeasons, SEASON_COOKIE } from "@/lib/season-constants";

// Persisted for a year so it survives across page navigations and future
// visits; path=/ so it applies to every route, not just the one it was
// picked on. Defined outside the component since assigning document.cookie
// directly inside a component body trips the react-hooks immutability
// lint rule.
function persistSeason(year: number) {
  document.cookie = `${SEASON_COOKIE}=${year}; path=/; max-age=31536000; samesite=lax`;
}

// Lives in the global nav bar, so it has no page-supplied season of its
// own: the current page's ?season= wins when present (so Results/Positions
// still reflect what's in the URL), otherwise it falls back to
// initialSeason, which the layout resolved server-side from the persisted
// cookie — keeping the picked season in sync across page navigations.
export default function SeasonSelector({ initialSeason }: { initialSeason: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const seasons = availableSeasons();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // The nav bar (and this selector within it) stays mounted across page
  // navigations rather than re-rendering from the server, so initialSeason
  // is only ever correct on first load — picking a season on one page and
  // then following a plain nav link (no ?season=) to another would keep
  // showing the season you started on. Track the last season actually
  // seen in the URL in state instead, so the display stays in sync even
  // once the URL param that set it is gone.
  const urlSeason = Number(searchParams.get("season"));
  const hasUrlSeason = seasons.includes(urlSeason);
  const [lastKnownSeason, setLastKnownSeason] = useState(initialSeason);
  if (hasUrlSeason && urlSeason !== lastKnownSeason) {
    setLastKnownSeason(urlSeason);
  }
  const season = hasUrlSeason ? urlSeason : lastKnownSeason;

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
    persistSeason(nextSeason);
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
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
          className="switcher-calendar-icon"
        >
          <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M1.5 5.5H12.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4 1.5V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M10 1.5V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span>{season}</span>
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
              {year}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
