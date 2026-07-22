# F1 Results Tracker

A Formula 1 race results tracker built with Next.js, TypeScript and Tailwind CSS.
It pulls live race and championship data from the
[Jolpica F1 API](https://api.jolpi.ca/ergast/f1) (a community-run successor to
the retired Ergast API) and presents it as a driver-by-Grand-Prix points
heatmap plus driver/constructor standings.

## Pages

- **Points** (`/points`) — every driver's points for each round of a season,
  shaded by magnitude, alongside a season points total bar per driver.
- **Standing** (`/standings`) — driver and constructor championship standings.
- Other sidebar sections (Results, Positions, Quali, Teams, Calendar, etc.)
  are placeholders for now.

Pick a season from the selector at the top of Points/Standing; the app
defaults to the current calendar year.

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Data source

All race, sprint and standings data is fetched server-side from
`https://api.jolpi.ca/ergast/f1` at request time (with caching via Next.js
`fetch` revalidation). No API key is required. Grand Prix column
abbreviations/flags and constructor colors are mapped locally in
`src/lib/circuits.ts` and `src/lib/team-colors.ts`.

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Server Components for data fetching, no client-side data store
