// The Ergast/Jolpica API returns full official entrant names ("Haas F1
// Team", "Alpine F1 Team", "RB F1 Team"), which read as noisy branding next
// to a driver's name. This trims that down to how the teams are actually
// talked about.
const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  rb: "Racing Bulls",
};

export function teamDisplayName(constructorId: string, rawName: string): string {
  const override = DISPLAY_NAME_OVERRIDES[constructorId];
  if (override) return override;
  return rawName.replace(/\s+F1\s+Team$/i, "");
}
