#!/usr/bin/env node
// Captures a static image of each Grid Walk card's content, for every
// theme x palette combination, for the current season only. These stand
// in for the live-rendered card content (tables/charts/bars) on the home
// page — by far the single biggest cost to the GPU on every drag frame
// (see "grid-walk-blur-gpu-cost" project memory, from a real device
// trace). GridWalk.tsx falls back to live rendering for any season this
// hasn't been run for, or any image that's missing, so a partial or
// stale run never breaks the page.
//
// Run against a server already serving the built app (see the
// "capture-card-snapshots" GitHub Actions workflow for the full
// build-and-serve sequence), or locally: npm run build && npm run start
// -- -p 3100, then node scripts/capture-card-snapshots.mjs.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.SNAPSHOT_PORT || "3100";
const BASE_URL = `http://localhost:${PORT}`;
const SEASON = Number(process.argv[2]) || new Date().getFullYear();
const OUT_ROOT = path.join(__dirname, "..", "public", "card-snapshots", String(SEASON));

const ACCENTS = ["monokai", "coffee", "red", "dracula"];
const THEMES = ["light", "dark"];
// Index within GridWalk's `sections` array (and so its `.gw-toptab` nav
// tabs) — each must be focused via its tab before its card is screenshot,
// since an unfocused card sits dimmed and off-centre in the carousel.
const PLAIN_SECTIONS = [
  { id: "results", tabIndex: 0 },
  { id: "evolution", tabIndex: 1 },
  { id: "positions", tabIndex: 2 },
  { id: "podiumsD", tabIndex: 4 },
];
const FREQ_TAB_INDEX = 3;
// .gw-slot's opacity transition (0.35s) plus the camera-pan/zoom-reset
// animation goTo() triggers both need to fully settle before a screenshot.
const FOCUS_SETTLE_MS = 900;

async function focusTab(page, tabIndex) {
  const tabs = await page.$$(".gw-toptab");
  await tabs[tabIndex].click();
  await page.waitForTimeout(FOCUS_SETTLE_MS);
}

async function main() {
  // Unset in CI (a freshly `playwright install`ed browser is used there);
  // only needed to point at a specific local Chromium build.
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

  for (const accent of ACCENTS) {
    for (const theme of THEMES) {
      const dir = path.join(OUT_ROOT, `${accent}-${theme}`);
      await mkdir(dir, { recursive: true });

      const page = await browser.newPage({
        viewport: { width: 1800, height: 1200 },
        deviceScaleFactor: 2,
      });
      await page.addInitScript(
        ({ accent, theme }) => {
          window.localStorage.setItem("f1-theme", theme);
          window.localStorage.setItem("f1-accent", accent);
        },
        { accent, theme }
      );
      // noSnapshot=1 forces GridWalk to render cards live even for the
      // snapshot season — otherwise this script would screenshot the very
      // snapshot <img> it's meant to be regenerating.
      await page.goto(`${BASE_URL}/?season=${SEASON}&noSnapshot=1`, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);

      for (const { id, tabIndex } of PLAIN_SECTIONS) {
        await focusTab(page, tabIndex);
        const el = await page.$(`.gw-snap-target[data-section="${id}"]`);
        if (!el) {
          console.warn(`skip ${accent}-${theme}/${id}: not found on page`);
          continue;
        }
        await el.screenshot({ path: path.join(dir, `${id}.png`), type: "png" });
        console.log(`${accent}-${theme}/${id}.png`);
      }

      await focusTab(page, FREQ_TAB_INDEX);
      const freqEl = await page.$('.gw-snap-target[data-section="freq"]');
      if (freqEl) {
        await freqEl.screenshot({ path: path.join(dir, "freq-finish.png"), type: "png" });
        console.log(`${accent}-${theme}/freq-finish.png`);

        await page.click(".gw-freq-toggle");
        await page.waitForTimeout(300);
        const freqEl2 = await page.$('.gw-snap-target[data-section="freq"]');
        await freqEl2.screenshot({ path: path.join(dir, "freq-quali.png"), type: "png" });
        console.log(`${accent}-${theme}/freq-quali.png`);
      }

      await page.close();
    }
  }

  await browser.close();
  console.log(`Done: season ${SEASON}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
