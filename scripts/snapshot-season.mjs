#!/usr/bin/env node
// Fetches one season's full schedule, standings, and per-round race/sprint
// results from the Jolpica F1 API and writes them to data/seasons/<year>.json.
// Run once per completed season (npm run snapshot:season -- 2020) so the app
// can serve that season from the repo instead of the live API, which
// rate-limits hard under the ~50 concurrent requests a full season needs.
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://api.jolpi.ca/ergast/f1";
const season = Number(process.argv[2]);

if (!season || Number.isNaN(season)) {
  console.error("Usage: node scripts/snapshot-season.mjs <season>");
  process.exit(1);
}

async function getJson(pathSuffix, attempt = 1) {
  const res = await fetch(`${BASE_URL}${pathSuffix}`);
  if (res.status === 429 && attempt <= 5) {
    const wait = attempt * 1500;
    console.log(`Rate limited on ${pathSuffix}, retrying in ${wait}ms...`);
    await new Promise((resolve) => setTimeout(resolve, wait));
    return getJson(pathSuffix, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`${pathSuffix} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function main() {
  console.log(`Fetching ${season} schedule...`);
  const scheduleData = await getJson(`/${season}.json?limit=100`);
  const schedule = scheduleData.MRData.RaceTable.Races;

  console.log(`Fetching ${season} driver standings...`);
  const driverData = await getJson(`/${season}/driverStandings.json?limit=100`);
  const driverStandings = driverData.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];

  console.log(`Fetching ${season} constructor standings...`);
  const constructorData = await getJson(`/${season}/constructorStandings.json?limit=100`);
  const constructorStandings =
    constructorData.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];

  const results = {};
  const sprintResults = {};

  // Sequential, not parallel: Jolpica rate-limits aggressively enough that a
  // full season fetched round-by-round is far more reliable than firing all
  // rounds at once.
  for (const race of schedule) {
    const round = Number(race.round);
    console.log(`Fetching ${season} round ${round} results...`);
    const resultData = await getJson(`/${season}/${round}/results.json?limit=100`);
    results[round] = resultData.MRData.RaceTable.Races[0]?.Results ?? [];

    if (race.Sprint) {
      console.log(`Fetching ${season} round ${round} sprint results...`);
      const sprintData = await getJson(`/${season}/${round}/sprint.json?limit=100`);
      sprintResults[round] = sprintData.MRData.RaceTable.Races[0]?.SprintResults ?? [];
    }
  }

  const snapshot = {
    season,
    schedule,
    driverStandings,
    constructorStandings,
    results,
    sprintResults,
  };

  const outDir = path.join(process.cwd(), "data", "seasons");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${season}.json`);
  await writeFile(outPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
