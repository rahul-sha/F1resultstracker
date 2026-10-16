// Real-world F1 constructor brand colors, keyed by the Ergast/Jolpica
// constructorId. These are fixed team identities (like a logo), so they are
// used as-is rather than drawn from the categorical data-viz ramp.
const TEAM_COLORS: Record<string, string> = {
  red_bull: "#3671C6",
  mclaren: "#F58020",
  ferrari: "#E8002D",
  mercedes: "#27F4D2",
  aston_martin: "#229971",
  alpine: "#00A1E8",
  williams: "#1868DB",
  rb: "#6C98FF",
  alphatauri: "#5E8FAA",
  toro_rosso: "#469BFF",
  haas: "#B6BABD",
  sauber: "#52C832",
  kick_sauber: "#52C832",
  alfa: "#C92D4B",
  renault: "#FFF500",
  force_india: "#F596C8",
  racing_point: "#F596C8",
  lotus_f1: "#FFB800",
};

const FALLBACK_COLORS = [
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF7C7C",
  "#8DD1E1",
  "#A28FD0",
];

export function teamColor(constructorId: string): string {
  if (TEAM_COLORS[constructorId]) return TEAM_COLORS[constructorId];
  let hash = 0;
  for (let i = 0; i < constructorId.length; i++) {
    hash = (hash * 31 + constructorId.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}
