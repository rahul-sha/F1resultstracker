# F1 Results Tracker

A personal Formula 1 results tracker built with Next.js, TypeScript and
Tailwind CSS. It reads race, sprint and championship data from the
[Jolpica F1 API](https://api.jolpi.ca/ergast/f1) (a community-run successor
to the retired Ergast API) and presents it as a set of driver/constructor
heatmaps and standings, styled after Google's Material 3 Expressive
language.

## Pages

- **Results** (`/results`) — every driver's points for each round of a
  season, shaded by magnitude, with a season points total bar per driver,
  and a matching per-race heatmap for Constructors underneath. Pole
  position and fastest lap are marked with a small "P"/"F" superscript
  next to the points value. Tables that overflow pan by clicking and
  dragging on desktop, or normal touch scrolling on phones — there's no
  separate scrollbar.
- **Positions** (`/positions`) — where each driver finished each race
  (not points), with a median-finish summary, followed by how often each
  driver finished in each position across the season (with a DNF count)
  and a podium-finishes count for drivers and teams. Sprint weekends show
  the sprint result as a small superscript next to the main race result.
- **About** (`/about`) — who built this and how, credits, and a progress
  timeline.

Every page sits over a soft gradient glow built from the active theme's
own colours, rather than a single flat background — it drifts slowly
rather than sitting still.

Pick a season from the selector, built into the nav bar at every screen
size. The app defaults to the current calendar year. Only seasons 2020
onwards are supported.

## Navigation

A single floating nav bar is used at every screen size — there's no
separate desktop top bar and mobile dock, just one component. Results,
Positions and About sit in a horizontally scrollable tab strip (hidden
scrollbar; on narrow screens every tab, including the active one, is
icon-only, so the bar stays a constant width across pages), the season
selector stays pinned beside them, and a hamburger button grows the bar
itself into a panel holding the theme and palette toggles. The bar sits
at the bottom of the viewport on narrow screens and at the top on wider
ones, with the hamburger panel opening in whichever direction (up or
down) keeps it growing away from the screen edge the bar is pinned to.

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Data source

Season data is snapshot-first: each season from 2020 onwards is saved as a
JSON file in `data/seasons/<year>.json`, committed to the repo, so pages
don't hit the live API on every request. The current season's snapshot is
refreshed by a weekly GitHub Action (`snapshot-season.yml`, also runnable
manually via `workflow_dispatch`). A live fetch from
`https://api.jolpi.ca/ergast/f1` is used only as a fallback, when no
snapshot exists yet for a season at all. No API key is required.

Grand Prix flags/abbreviations, constructor colours and team-name display
overrides are mapped locally in `src/lib/circuits.ts`,
`src/lib/team-colors.ts` and `src/lib/team-names.ts`.

## Theming

Four colour palettes — Monokai (default), Coffee, Ember and Dracula — each
togglable from the nav bar's hamburger menu and persisted in `localStorage`.
All four have both a light and a dark variant. All colour in the UI, including the heatmap
shading, comes from theme CSS custom properties (see `src/app/globals.css`),
so nothing is hardcoded to a single palette.

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Server Components for data fetching, no client-side data store

## Security

The season-snapshot GitHub Action (`snapshot-season.yml`) passes its
workflow inputs to the shell via `env:` variables rather than interpolating
them directly into `run:` script text, which avoids a class of GitHub
Actions script-injection vulnerability. `next.config.ts` sets a small set
of standard browser security headers (`X-Frame-Options`,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`). The
app has no auth, forms or API routes, and no secrets are committed to the
repo.
