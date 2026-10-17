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
  next to the points value.
- **Positions** (`/positions`) — where each driver finished each race
  (not points), with a median-finish summary, followed by how often each
  driver finished in each position across the season (with a DNF count)
  and a podium-finishes count for drivers and teams. Sprint weekends show
  the sprint result as a small superscript next to the main race result.
- **About** (`/about`) — who built this and how, credits, and a progress
  timeline.

Pick a season from the selector; on a wide screen it sits in the top nav
bar, on a phone it's built into the bottom dock nav. The app defaults to
the current calendar year. Only seasons 2020 onwards are supported.

## Navigation

On screens wider than 640px, navigation is a floating top bar with
Results, Positions and About, each paired with a small icon, plus the
season selector and the theme/palette toggles. Below that width the top
bar is replaced by a bottom dock: Results and Positions as the two main
tabs, the season selector and an About shortcut built in, and a hamburger
button that opens a sheet with the same theme and palette toggles.

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

Three colour palettes — Monokai (default), Coffee and Ember — each with a
light and dark variant, togglable from the top bar (or, on mobile, the
dock's hamburger menu) and persisted in `localStorage`. All colour in the UI, including the heatmap shading, comes
from theme CSS custom properties (see `src/app/globals.css`), so nothing
is hardcoded to a single palette.

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
