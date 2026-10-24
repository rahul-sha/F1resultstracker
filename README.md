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
  order as the "Jump to" bar below. Two are stacked pairs, each a
  driver half and a team half sharing one card with a divider: Driver
  Points Evolution & Constructor Points Evolution, and Driver Podiums &
  Constructor Podiums. Two are toggled pairs instead: Drivers Results and
  Team Results, and Finish Frequency and Qualifying Frequency, each
  sharing a card with a pill button in its header that swaps between the
  two tables in place rather than stacking them. The last is Positions on
  its own. Each card *is* the real heatmap, chart, grid or podium bars
  for the selected season, under the same title and subtitle it has on
  its own page. Every card is the same height, with its content scaled to
  fill that height and the card as wide as that makes it, then the whole
  strip is fitted to the space between the top and bottom bars. Every card,
  for every season, is a pre-rendered lossless WebP image of its content
  under `public/card-snapshots/<season>/<palette>-<theme>/`, with a
  `manifest.json` per season recording each image's natural size so the
  cards can be laid out before anything has loaded. Visitors never render a
  card live and never receive the season's data grids. The images are made
  by `scripts/capture-card-snapshots.mjs` (`capture-card-snapshots.yml`
  runs it every Monday for the current season; pass a year or `all` to
  capture finished seasons once), which loads the built site with
  `?noSnapshot=1`, the one mode in which cards still render live, so it
  captures the real tables rather than its own previous images. The
  visitor's theme and palette are kept in cookies (`f1-theme`, `f1-accent`)
  as well as `localStorage`, so the server picks the right image on first
  paint; with no theme chosen yet a `<picture>` media query follows the
  device. The other seven colour combinations for the open season are
  prefetched when the browser is idle; other seasons load when picked. The
  centred card is at full strength and its neighbours peek in, dimmed, on
  either side. Browse by dragging or swiping (one card per flick), with
  the side arrows, the ← → keys or the jump-bar tabs. Scroll the mouse
  wheel or pinch (trackpad or two fingers) to zoom around the pointer,
  and drag to pan while zoomed in; a sideways trackpad swipe browses
  instead. Clicking the centred card jumps it to full size, and the Fit
  button (or Esc) brings it back. Cards stay hidden until measured, so
  they never flash up full size on load; once measured they rise into
  place and fade in, left to right, a beat apart (only `translate` and
  `opacity` move, it runs once per visit rather than on every season or
  theme switch, and it is off under reduced-motion settings). On desktop a single translucent nav bar
  across the top holds the jump tabs plus About, the icon-only theme and
  palette toggles, and the season switcher; the open card's tab rests at
  the left of the tab strip, and scrolling the mouse wheel over it or
  dragging it browses the cards in either direction. Presses, drags and
  scrolls on the bars never move or zoom the cards underneath. Beside it, the logo is its own island of the same height that
  takes you back to the first card, and the zoom controls sit in a small
  pill in the bottom corner. On phones the controls stay at the top and
  the jump tabs sit at the bottom in a matching nav-bar pill (solid
  rather than translucent), with Fit after a divider; the open card's tab
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
and the About page sit on a plain translucent surface (no blur: a real
device trace showed backdrop and glow blur costing the GPU on every
frame); table cards elsewhere are solid. Every page's title/subtitle
card is a fixed width and height, so the content underneath always
starts at the same position regardless of how long that page's
subtitle runs.

Pick a season from the selector in Grid Walk's top bar — shown as a
calendar icon next to the year. The app defaults to
the current calendar year. Only seasons 2020 onwards are supported.

## Navigation

Grid Walk's own top bar and jump bar are the navigation on the home page.
The About page has no nav bar at all — just the Grid Walk logo as a translucent
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
togglable from Grid Walk's top bar and persisted in `localStorage` (and a
cookie, for the server-picked card images) under the keys `monokai`,
`coffee`, `ember` and `dracula`; a choice saved under Ember's old key, `red`,
is still honoured.
All four have both a light and a dark variant; the theme button flips
between Light and Dark (there's no Auto option), starting from whatever the
device shows until it's first clicked. All colour in the UI, including the heatmap
shading, comes from theme CSS custom properties (see `src/app/globals.css`),
so nothing is hardcoded to a single palette. The icon-only theme and
palette buttons spin their icon and send out an accent ring on each
click, so every change has visible feedback.

## Design system

The full reference, with the name of every part, the tokens, the rules,
and where each one lives in the code, is [docs/design-system.md](docs/design-system.md).

The UI is built from three shapes: an **island** (a 48px floating,
rounded container such as the nav bar, jump bar or logo island), a
**pill** (a 36px control inside an island, such as a tab) and a **card**
(one graphic). Their heights, radii, shadows and the translucent island
fill are design tokens at the top of `src/app/globals.css`
(`--island-h`, `--pill-h`, `--card-h`, `--radius-*`, `--shadow-*`,
`--island-fill`), and each shape is styled once in `src/styles/ui.css`
(`.ui-island`, `.ui-pill`, `.ui-pill--accent`, `.ui-icon-pill`,
`.ui-divider`, `.ui-tab-strip`, `.ui-card`, `.ui-card-toggle`,
`.ui-card-views`, `.ui-subsection`, `.ui-logo`, `.ui-card-header`,
`.ui-menu`). Component stylesheets only add position and layout on top of
these.

The same shapes exist as React components in `src/components/ui/`:
`Island`, `Pill` (with `accent`, `active` and `icon` variants, plus
`IconPill`), `Divider`, `TabStrip` (a scrolling row of tab pills with the
swipe, mouse-drag and wheel browsing built in), `Logo`, `CardHeader`,
`CardToggle`, `Menu`, and the `ThemeIcon` and `PaletteIcon` icons. New UI
should be built from these rather than from raw elements and one-off
classes.

## Install as an app

Grid Walk is a Progressive Web App (PWA): a web app manifest
(`public/manifest.webmanifest`), a set of home-screen icons
(`public/icons/`, `public/apple-touch-icon.png`), a themed status bar, and a
minimal service worker (`public/sw.js`, no caching — it only exists so
browsers recognise the app as installable) let Chrome, Edge and Safari
offer "Install" or "Add to Home Screen" instead of only opening a browser
tab.

- **Android (Chrome):** open the site, tap the **⋮** menu, then **Add to
  Home screen** / **Install app**.
- **iPhone/iPad (Safari):** open the site, tap the **Share** icon, then
  **Add to Home Screen**.
- **Desktop (Chrome/Edge):** open the site, click the install icon at the
  right of the address bar (or the **⋮** menu → **Install Grid Walk…**).

The browser tab icon switches between a light and dark version to match the
device's own light/dark setting (two `media`-targeted icons in
`layout.tsx`, plus `favicon.ico` as the plain fallback). The home-screen
icon itself can't retheme live once installed — that's a platform
limitation, not something a web app can control — but on Android 13+ a
"monochrome" variant (`public/icons/icon-monochrome.png`, `purpose:
"monochrome"` in the manifest) lets the OS tint it to match the phone's
system theme automatically, the same as a native app's themed icon.

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Server Components for data fetching, no client-side data store. The Points
Evolution chart (`PointsEvolutionChart.tsx`) hit-tests its nearest point from
a single listener over the whole plot rather than giving every data point
its own invisible hit target, which used to add well over a thousand extra
SVG shapes to that one card

## Security

The season-snapshot GitHub Action (`snapshot-season.yml`) passes its
workflow inputs to the shell via `env:` variables rather than interpolating
them directly into `run:` script text, which avoids a class of GitHub
Actions script-injection vulnerability. `next.config.ts` sets a small set
of standard browser security headers (`X-Frame-Options`,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`). The
app has no auth, forms or API routes, and no secrets are committed to the
repo.
