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
      className="rounded-full px-4 py-1.5 text-sm font-medium"
      style={{
        border: "none",
        background: "var(--surface-2)",
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
