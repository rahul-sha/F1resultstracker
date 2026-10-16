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

  const urlSeason = Number(searchParams.get("season"));
  const season = seasons.includes(urlSeason) ? urlSeason : initialSeason;

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
