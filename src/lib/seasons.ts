const FIRST_SEASON = 1950;

export function currentSeason(): number {
  return new Date().getFullYear();
}

export function availableSeasons(): number[] {
  const latest = currentSeason();
  const seasons: number[] = [];
  for (let year = latest; year >= FIRST_SEASON; year--) {
    seasons.push(year);
  }
  return seasons;
}
