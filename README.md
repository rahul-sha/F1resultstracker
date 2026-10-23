# Grid Walk

A personal Formula 1 results tracker built with Next.js, TypeScript and
Tailwind CSS. It reads race, sprint and championship data from the
[Jolpica F1 API](https://api.jolpi.ca/ergast/f1) (a community-run successor
to the retired Ergast API) and presents it as a set of driver/constructor
heatmaps and standings, styled after Google's Material 3 Expressive
language.

## Pages

- **Home / Grid Walk** (`/`) — the site's entry point: the season's
  five graphics laid out on one horizontal carousel strip, in the same
  order as the "Jump to" bar below. Three are stacked pairs, each a
  driver half and a team half sharing one card with a divider: Drivers
  Results & Team Results, Driver Points Evolution & Constructor Points
  Evolution, and Driver Podiums & Constructor Podiums. One is a toggled
  pair instead: Finish Frequency and Qualifying Frequency share a card
  with a pill button in its header that swaps between the two tables in
  place rather than stacking them. The last is Positions on its own.
  Each card *is* the real heatmap, chart, grid or podium bars for the
  selected season, under the same title and subtitle it has on its own
  page, fitted to the space between
  the top and bottom bars (never enlarged past its natural size). The
  centred card is at full strength and its neighbours peek in, dimmed, on
  either side. Browse by dragging or swiping (one card per flick), with
  the side arrows, the ← → keys or the jump-bar tabs. Scroll the mouse
  wheel or pinch (trackpad or two fingers) to zoom around the pointer,
  and drag to pan while zoomed in; a sideways trackpad swipe browses
  instead. Clicking the centred card jumps it to full size, and the Fit
  button (or Esc) brings it back. Cards stay hidden until measured, so
  they never flash up full size on load. On desktop a single glass nav bar
  across the top holds the jump tabs plus About, the icon-only theme and
  palette toggles, and the season switcher; the open card's tab rests at
  the left of the tab strip, and scrolling the mouse wheel over it or
  dragging it browses the cards in either direction. Presses, drags and
  scrolls on the bars never move or zoom the cards underneath. Beside it, the logo is its own island of the same height that
  takes you back to the first card, and the zoom controls sit in a small
  pill in the bottom corner. On phones the controls stay at the top and
  the jump tabs sit at the bottom in a matching nav-bar pill (solid
  rather than blurred), with Fit after a divider; the open card's tab
  rests at the left, and swiping the tabs browses the cards. All of it sits over the same drifting glow
  used site-wide. Behind the cards sits a live grid drawn in the active
  theme's colours: it bends and glows in the accent colour around the
  cursor or a finger, sends a ring outwards on each click or tap, drifts
  with the strip as you browse and zoom, and carries the odd accent
  "telemetry" streak along its lines (all motion switches off under
  reduced-motion settings); its pointer glow and press-ripples are only
  ever redrawn over the small area they actually light up, and the frame
  is skipped entirely once nothing is moving, so dragging and scrolling
  stay smooth; the cards also only re-measure their own size when it can
  actually change (a season switch or the Finish/Qualifying toggle),
  rather than on every drag. Grid Walk is now the only home for this data:
  the old standalone Results and Positions pages were removed, and their
  addresses redirect to the home page.
- **About** (`/about`) — who built this and how, credits, and a progress
  timeline.

Every page sits over a soft gradient glow built from the active theme's
own colours, rather than a single flat background — it drifts slowly
rather than sitting still. The Grid Walk bars and logo, each page's title/subtitle card,
and the About page sit on a blurred, translucent glass surface so that
glow shows through them (solid below 640px, where backdrop blur isn't
reliable); table cards elsewhere are solid. Every page's title/subtitle
card is a fixed width and height, so the content underneath always
starts at the same position regardless of how long that page's
subtitle runs.

Pick a season from the selector in Grid Walk's top bar — shown as a
calendar icon next to the year. The app defaults to
the current calendar year. Only seasons 2020 onwards are supported.

## Navigation

Grid Walk's own top bar and jump bar are the navigation on the home page.
The About page has no nav bar at all — just the Grid Walk logo as a glass
island (top left on desktop, bottom centre on phones) that links back home.

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
togglable from Grid Walk's top bar and persisted in `localStorage`.
All four have both a light and a dark variant; the theme button flips
between Light and Dark (there's no Auto option), starting from whatever the
device shows until it's first clicked. All colour in the UI, including the heatmap
shading, comes from theme CSS custom properties (see `src/app/globals.css`),
so nothing is hardcoded to a single palette. The icon-only theme and
palette buttons spin their icon and send out an accent ring on each
click, so every change has visible feedback.

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
