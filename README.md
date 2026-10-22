# Grid Walk

A personal Formula 1 results tracker built with Next.js, TypeScript and
Tailwind CSS. It reads race, sprint and championship data from the
[Jolpica F1 API](https://api.jolpi.ca/ergast/f1) (a community-run successor
to the retired Ergast API) and presents it as a set of driver/constructor
heatmaps and standings, styled after Google's Material 3 Expressive
language.

## Pages

- **Home / Grid Walk** (`/`) — the site's entry point: the season's
  eight graphics laid out on one horizontal carousel strip, in the same
  order as the "Jump to" bar below — Results, Constructors, Driver Points
  Evolution, Positions, Finish Frequency, Qualifying Frequency, Driver
  Podiums and Constructor Podiums. Each card *is* the real heatmap,
  chart, grid or podium bars for the selected season, under the same
  title and subtitle it has on its own page, fitted to the space between
  the top and bottom bars (never enlarged past its natural size). The
  centred card is at full strength and its neighbours peek in, dimmed, on
  either side. Browse by dragging or swiping (one card per flick), with
  the side arrows, the ← → keys or the jump-bar pills. Scroll the mouse
  wheel or pinch (trackpad or two fingers) to zoom around the pointer,
  and drag to pan while zoomed in; a sideways trackpad swipe browses
  instead. Clicking the centred card jumps it to full size, and the Fit
  button (or Esc) brings it back. Cards stay hidden until measured, so
  they never flash up full size on load. The top bar — About, the
  icon-only theme and palette toggles, and the season switcher, all the
  same height — stays on screen throughout, over the same drifting glow
  used site-wide. Results and Positions keep their own full pages too —
  Grid Walk's cards reuse the exact same data and components rather than
  duplicating them.
- **Results** (`/results`) — every driver's points for each round of a
  season, shaded by magnitude, with a season points total bar per driver,
  and a matching per-race heatmap for Constructors underneath. Pole
  position and fastest lap are marked with a small "P"/"F" superscript
  next to the points value. A thin underline beneath a round's flag chip
  marks a sprint weekend. Tables that overflow pan by clicking and
  dragging on desktop, or normal touch scrolling on phones — there's no
  separate scrollbar. Underneath both heatmaps sit a Driver Points
  Evolution chart and, in its own section below, a Constructors Points
  Evolution chart, each plotting cumulative points as a smoothly curved
  line per driver or team across the season, with each round's flag
  along the x-axis and a hover tooltip for the exact total. There's no
  numeric y-axis; instead, every line ends in its own small pill showing
  that driver or team's live points total, with a thin leader line back
  to the line whenever rank order and value don't line up exactly — the
  chart grows tall enough that the whole field gets a pill, nobody's
  cropped out. The plot's width stretches to fill the space next to that
  points column rather than using a fixed size, falling back to a
  horizontal scroll only once there isn't room to space every round out
  legibly.
- **Positions** (`/positions`) — where each driver finished each race
  (not points), with a median-finish summary, followed by how often each
  driver finished in each position across the season (with a DNF count),
  a Qualifying frequency heatmap in the same style (ranked by average
  qualifying position rather than the championship standings, so it shows
  qualifying form on its own), and a podium-finishes count for drivers and
  teams. Sprint weekends show the sprint result as a small superscript
  next to the main race result.
- **About** (`/about`) — who built this and how, credits, and a progress
  timeline.

Every page sits over a soft gradient glow built from the active theme's
own colours, rather than a single flat background — it drifts slowly
rather than sitting still. The nav bar, each page's title/subtitle card,
and the About page sit on a blurred, translucent glass surface so that
glow shows through them (solid below 640px, where backdrop blur isn't
reliable); table cards elsewhere are solid. Every page's title/subtitle
card is a fixed width and height, so the content underneath always
starts at the same position regardless of how long that page's
subtitle runs.

Pick a season from the selector, built into the nav bar at every screen
size — shown as a calendar icon next to the year. The app defaults to
the current calendar year. Only seasons 2020 onwards are supported.

Every heatmap, grid and chart has a small share button beside its heading.
It renders that one graphic as a PNG in the browser (no server or image
hosting involved) and offers saving it, copying it to the clipboard for
pasting into Reddit, X or Discord, or, on phone and Mac, opening the native
share sheet directly.

A thin rail down the left edge (900px and wider) lists the sections on
the current page and highlights whichever one is in view as you scroll
— a hint that there's more below, and a click-to-jump shortcut. With it
in place the browser's own scrollbar is hidden, since it would just be
a second copy of the same information. Scrolling past the very bottom
of a page and continuing to pull springs forward to the next page in
nav order (Results → Positions → About); a short, ordinary over-scroll
does nothing, so this only fires on a deliberate, sustained pull, and
the footer is still reached by scrolling normally.

## Navigation

A single floating nav bar is used at every screen size on every page
except the home page itself — there's no separate desktop top bar and
mobile dock, just one component. Home, Results, Positions and About sit
in a horizontally scrollable tab strip (hidden scrollbar; on narrow
screens every tab, including the active one, is icon-only, so the bar
stays a constant width across pages), the season selector stays pinned
beside them, and a hamburger button grows the bar itself into a panel
holding the theme and palette toggles. The bar sits at the bottom of the
viewport on narrow screens and at the top on wider ones, with the
hamburger panel opening in whichever direction (up or down) keeps it
growing away from the screen edge the bar is pinned to. The home page
hides this bar entirely — Grid Walk's drag-and-click cards are the
navigation there, and a Home tab on every other page leads back to it.

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
