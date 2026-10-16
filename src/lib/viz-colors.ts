// Validated sequential blue ramp (light mode), one hue light -> dark, used to
// encode point magnitude in the heatmap. See dataviz skill references/palette.md.
const SEQUENTIAL_BLUE_LIGHT = [
  "#cde2fb", // 100
  "#b7d3f6", // 150
  "#9ec5f4", // 200
  "#86b6ef", // 250
  "#6da7ec", // 300
  "#5598e7", // 350
  "#3987e5", // 400
  "#2a78d6", // 450
  "#256abf", // 500
  "#1c5cab", // 550
  "#184f95", // 600
  "#104281", // 650
  "#0d366b", // 700
];

const SEQUENTIAL_BLUE_DARK = [
  "#0d366b",
  "#104281",
  "#184f95",
  "#1c5cab",
  "#256abf",
  "#2a78d6",
  "#3987e5",
  "#5598e7",
  "#6da7ec",
  "#86b6ef",
  "#9ec5f4",
  "#b7d3f6",
  "#cde2fb",
];

// t in [0, 1], 0 = near zero (recedes toward surface), 1 = max value.
export function sequentialBlue(t: number, mode: "light" | "dark" = "light"): string {
  const ramp = mode === "light" ? SEQUENTIAL_BLUE_LIGHT : SEQUENTIAL_BLUE_DARK;
  const clamped = Math.min(1, Math.max(0, t));
  const index = Math.round(clamped * (ramp.length - 1));
  return ramp[index];
}

// Cell text needs to flip once the fill gets too dark/light to hold contrast.
// Light mode darkens toward max (t=1); dark mode's ramp runs the other way
// (near-zero recedes into the dark surface, max pops bright), so the flip
// threshold mirrors accordingly.
export function textOnSequential(t: number, mode: "light" | "dark" = "light"): string {
  const dark = t > 0.55;
  const useWhiteText = mode === "light" ? dark : !dark;
  return useWhiteText ? "#ffffff" : "#0b0b0b";
}
