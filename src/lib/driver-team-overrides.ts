// The Ergast/Jolpica API sometimes lags a mid-season driver change (a
// reserve stepping in, a seat swap), so picking a driver's "latest"
// constructor from the standings data can land on the wrong team. This
// overrides specific (season, driverId) pairs to the constructorId they
// actually drove for, rather than the one the API currently reports.
//
// Edge case: a driver who changed teams mid-season, or a reserve driving
// only some rounds, only gets one constructor for the whole season here —
// the grid doesn't track a per-round team. Add an override only once the
// API is confirmed wrong for the rest of the season.
const DRIVER_TEAM_OVERRIDES: Record<number, Record<string, string>> = {
  2025: {
    lawson: "rb",
  },
};

export function overrideConstructorId(
  season: number,
  driverId: string,
  constructorId: string
): string {
  return DRIVER_TEAM_OVERRIDES[season]?.[driverId] ?? constructorId;
}
