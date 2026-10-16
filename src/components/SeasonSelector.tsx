"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { availableSeasons } from "@/lib/seasons";

export default function SeasonSelector({ season }: { season: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const seasons = availableSeasons();

  function handleChange(nextSeason: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("season", nextSeason);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={season}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded border px-3 py-1.5 text-sm font-medium"
      style={{
        borderColor: "var(--baseline)",
        background: "var(--surface-1)",
        color: "var(--text-primary)",
      }}
      aria-label="Season"
    >
      {seasons.map((year) => (
        <option key={year} value={year}>
          {year} season
        </option>
      ))}
    </select>
  );
}
