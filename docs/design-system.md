# Grid Walk design system

Third edition, 2026-10-24. The living copy of the design-system doc; update it with every change that touches an island, pill, card, token, or rule. The original Claude Doc (with the anatomy diagram) is at https://claude.ai/artifact/7GVBYKg68jq7hGS6Yxh6TB.

## Why this exists

Grid Walk grew over 60-odd rounds, so the same idea, such as a rounded pill, ended up with several names and several copies of its CSS. This doc fixes one name for each part, so a request like "make the island taller" or "give the jump bar's tabs more room" means one exact thing, and the code uses the same names.

This is the third edition. It describes the site after PRs #89 to #93 (rounds 64 to 68): five picture cards on the strip, two of them with a toggle, no blur anywhere, an About page with the live grid behind it, and one set of tokens, classes, and components behind every island, pill, and card.

## Glossary

The site uses three shapes. An **island** floats on its own, a **pill** is a small control that sits inside an island or a card, and a **card** holds one graphic. Every other name in this table is a particular kind of one of these three.

On desktop the jump tabs live inside the nav bar. On a phone they move to their own jump bar at the bottom, and the controls stay at the top. A card with two views carries a card toggle in its header.

| Name | What it is | Kind | Where you see it |
| --- | --- | --- | --- |
| Island | A floating, rounded container, 48px tall, translucent on desktop and solid on phones | Shape | Logo island, nav bar, jump bar, zoom island |
| Pill | A fully rounded control, 36px tall, that sits inside an island | Shape | Tabs, About, season picker, Fit |
| Icon pill | A round pill, 36 × 36px, holding only an icon | Shape | Theme and palette buttons |
| Card | A rounded tonal panel, 900px tall, holding one picture of a graphic with its title and subtitle at the top | Shape | The five cards on the card strip |
| Logo island | The island holding the Grid Walk mark and name. It goes back to the first card, or home from About | Island | Top left on desktop; bottom centre on About for phones |
| Nav bar | The desktop island at the top: the tab strip, a divider, then the controls | Island | Desktop only |
| Jump bar | The phone island at the bottom: the tab strip, a divider, then Fit | Island | Phones only |
| Zoom island | The small corner island with −, zoom level, + and Fit, styled as flat tabs | Island | Desktop only, bottom right |
| Tab strip | The scrolling row of tabs inside the nav bar or jump bar. The open card's tab rests at its left | Part | Nav bar, jump bar |
| Tab | A pill in the tab strip that opens one card. The active tab is filled with the accent container colour | Pill | Tab strip |
| Controls | About, theme, palette, and season, grouped together | Group | Inside the nav bar on desktop; the top row on phones |
| Accent pill | A pill tinted with the accent colour, for the one action that leaves or resets the view | Pill | About, Fit |
| Card toggle | A small accent pill, 12px text with a swap icon, at the top right of a card that has two views. It crossfades between them | Pill | Results (Drivers/Teams), Frequency (Finish/Qualifying) |
| Subsection | A second graphic lower in the same card, under its own header and a hairline | Part | Evolution (Constructors), Podiums (Teams) |
| Divider | A 1 × 22px hairline between groups inside an island | Part | Nav bar, jump bar |
| Menu | A floating panel of options that opens from a pill | Surface | Season picker |
| Card strip | The horizontal carousel of cards. The centred card is the focus card; its neighbours are dimmed. On first load the cards rise into place one after another | Layout | Grid Walk |
| Arrows | Round 44px buttons on the left and right edges that step one card | Control | Desktop |
| Dots | The row of 6px progress dots; the current one stretches into a dash | Indicator | Above the jump bar or zoom island |
| Hint | The one line of muted help text that fades after your first move | Text | Under the top bar |
| Page plane | The flat background colour every page sits on | Layer | Everywhere |
| Glow | The two slow-drifting accent blobs behind Grid Walk (`.gw-pulse-a`, `.gw-pulse-b`) | Layer | Grid Walk only |
| Live grid | The canvas grid that bends and glows round the cursor or finger | Layer | Grid Walk and About |
| Table card | The rounded surface that holds an About section, or a heatmap table in a capture | Surface | About |
| Demo clip | The short looping clip of Grid Walk at the top of the About timeline | Media | About |

In conversation, use the name in the first column. For example, "the jump bar's tabs" means the phone tabs, "the Results card toggle" means the Drivers/Teams switch, and "the nav bar's controls" means About, theme, palette, and season on desktop.

## Foundations

Every colour comes from a small set of tokens, and each palette in each theme fills in the same set. The look is Material 3 Expressive: tonal surfaces, fully rounded pills, and no boxed cells or gridlines. Since round 58 there is no blur anywhere, because it cost too much on the GPU and made dragging choppy.

**Colour tokens** (in `src/app/globals.css`, one block per theme and palette)

| Token | Role |
| --- | --- |
| `--page-plane` | Page background |
| `--surface-1`, `--surface-2`, `--surface-3` | Tonal surfaces, lowest to highest. Islands and cards use 2, hover uses 3 |
| `--text-primary`, `--text-secondary`, `--text-muted` | Text, strongest to weakest |
| `--accent` | Brand colour: logo mark, focus rings, glow, live grid |
| `--accent-container`, `--on-accent-container` | Fill and text for active tabs, card toggles, and selected options |
| `--border-hairline` | 12–14% outlines and dividers |
| `--gridline`, `--baseline` | Chart axes |
| `--heat-0` to `--heat-6`, `--heat-fg-lo`, `--heat-fg-hi` | The seven-step heatmap ramp and its text colours |

**Themes and palettes:** two themes (Light and Dark) times four palettes (Monokai, Coffee, Ember, and Dracula), set by `data-theme` and `data-accent` on the page root. The keys are `monokai`, `coffee`, `ember`, and `dracula`; a choice saved under Ember's old key, `red`, is still honoured and renamed on the next load. Each choice is saved twice: in local storage for the first paint, and in the cookies `f1-theme` and `f1-accent` so the server can pick the matching card pictures. There are eight sets of card pictures per season, one per theme and palette pair.

**Scale** (the tokens at the top of `src/app/globals.css`)

| Thing | Value | Used by |
| --- | --- | --- |
| Island height | 48px (`--island-h`) | Logo island, nav bar, jump bar, zoom island |
| Pill height | 36px (`--pill-h`) | Tabs, controls, Fit, zoom buttons |
| Card toggle height | about 28px (6px padding, 12px text) | Card toggle |
| Card height | 900px, every card (`--card-h`) | Cards on the strip |
| Arrow size | 44px | Arrows |
| Island radius | 28px (`--radius-island`) | All islands |
| Pill radius | 999px, fully round (`--radius-pill`) | All pills and card toggles |
| Card radius | 14px (`--radius-card`) | Cards on the strip, demo clip |
| Table card radius | 20px (`--radius-table-card`) | About sections |
| Menu radius | 16px, options 10px (`--radius-menu`, `--radius-menu-option`) | Season menu |
| Gap inside an island | 4px between tabs, 6–8px between groups | Nav bar, jump bar |
| Edge inset | 20px desktop, 0.9rem phone | Islands from the screen edge |

**Type:** the system font stack throughout. Pills and tabs use 13px at weight 600, and card toggles 12px at weight 600. The logo uses 0.95rem at weight 800, upper case, with 0.04em spacing. Card titles are 14px at weight 600 in `--text-secondary`, and subtitles, captions, and the hint use `--text-muted`.

**Elevation**

- **Translucent island** (desktop): `--island-fill` (`--surface-2` at 80% opacity) with `--shadow-island` (0 4px 16px at 22%, a hairline ring, and a faint top highlight). No blur.
- **Solid island** (phones): the same shape and shadow on plain `--surface-2`.
- **Card:** a hairline border and `--shadow-card` (0 14px 40px at 22%). **Menu:** `--shadow-menu` (0 8px 24px at 18% plus a hairline ring).
- **Glow:** two drifting accent radial blobs at 50% opacity, without a blur filter, on Grid Walk only.

**Motion**

- Tab and pill colours ease over 0.25s. A card toggle lifts 1px on hover and crossfades its two views over 0.22s.
- The theme and palette icons spin in over 0.45s with an accent ring over 0.6s.
- On first load each card rises 28px and fades in over 0.5s, 60ms after the one before. This plays once, so a season or theme change does not replay it.
- Cards glide with an ease-out camera. Reduced-motion settings switch all the decorative animations off.

## Components

Each component below lists what it holds, how it reacts, and where its code lives. Every shape is styled once in `src/styles/ui.css` (the `.ui-*` classes) and built once in `src/components/ui/` (the React components); the `gw-*` classes in `src/components/gridwalk/gridwalk.css` only add position and layout on top. New UI is built from these parts rather than from raw elements and one-off classes.

| Component | Holds | States | Desktop | Phone | Code |
| --- | --- | --- | --- | --- | --- |
| Logo island | Mark (accent) and "Grid Walk" | Hover tints with the accent; focus ring | 48px, top left | 36px, mark only under 480px; on About, bottom centre | `Logo` (`.ui-logo`); positioned by `.gw-brand` on Grid Walk and `.home-logo` on About |
| Nav bar | Tab strip, divider, controls | None of its own | Translucent island, width clamp(560px, 66vw, 940px), top centre | Splits: the controls sit as a top row, the tabs move to the jump bar | `Island` with `.gw-navpill` |
| Jump bar | Tab strip, divider, Fit | None of its own | Hidden | Solid island, full width less 0.9rem each side, 12px above the bottom | `Island` with `.gw-jumpbar-island`; on desktop the same island is the zoom island |
| Zoom island | −, level, +, Fit as flat tabs | Level reads "Fit" or a percentage | Translucent island, bottom right | Only Fit, inside the jump bar | `IconPill` and `Pill accent` inside `.gw-zoomctl` |
| Tab strip | Tabs | Snaps so the open tab rests at the left; swiping, wheeling, or dragging opens the tab that settles at the left; a fade on the right edge | Wheel steps one tab; mouse drag scrolls | Swipe scrolls | `TabStrip` (`.ui-tab-strip`): one component runs both strips, with the left-align, swipe, mouse-drag, wheel, and settle-to-open logic |
| Tab | Card title | Rest: muted text. Hover: `--surface-3`. Active: accent container | 36px, 13px/600 | Same | `Pill active` (`.ui-pill.active`), rendered by `TabStrip` |
| Accent pill | Label | Hover: `--surface-3` | About in the nav bar | Fit in the jump bar | `Pill accent` (`.ui-pill--accent`) |
| Icon pill | Icon | Press shrinks to 90%; each click spins the icon and sends an accent ring | 36 × 36px | Same | `IconPill` (`.ui-icon-pill`) in `ThemeToggle.tsx` and `AccentToggle.tsx`; the click feedback is `.icon-toggle-btn` in `globals.css`; icons in `ui/icons.tsx` |
| Season picker | Calendar icon, year, chevron; menu of seasons | Open flips the chevron; selected option uses accent container | Opens downwards | Same | `Pill` plus `Menu`, `MenuAnchor`, and `MenuOption` (`.ui-menu`, `.ui-menu-option`) in `SeasonSelector.tsx` |
| Card | Title, subtitle, a picture of the graphic, an optional subsection | Focus: full opacity. Neighbours: 38%. Click toggles fit and natural size. Rises in on first load | 900px tall, fitted between the bars, never enlarged | Same | `.ui-card` for the look; `.gw-slot`, `.gw-card`, `.gw-frame`, `.gw-fit` for size and placement; `CardHeader` (`.ui-card-header`) for the title |
| Card toggle | Swap icon and the other view's name | Hover lifts 1px; click crossfades the two pictures | Top right of the card header | Same | `CardToggle` (`.ui-card-toggle`) in the header (`.ui-card-head`); the two pictures are `.ui-card-views` and `.ui-card-view` |
| Subsection | Its own title and subtitle, then a graphic | None | A hairline and 1.6rem gap above | Same | `CardHeader subsection` (`.ui-subsection`) |
| Card picture | A `.webp` of one graphic, captured weekly per theme and palette | Shows "Image unavailable" at the right size if a capture is missing | Served by the server from the cookies | Same | `card-snapshots.ts`, `variant-constants.ts`, `scripts/capture-card-snapshots.mjs` |
| Table card | An About section, or a heatmap table in capture mode | Drag to pan sideways (tables only) | Radius 20px, translucent on About | Same | `.table-card`, `.about.table-card` in `globals.css` |
| Arrows | Chevron | Hidden at the first or last card | Left and right edges | Hidden | `.gw-arrow` |
| Dots | One dot per card | Current dot is an 18px accent dash | Above the zoom island | Above the jump bar | `.gw-dots` |
| Live grid | A canvas | Bends and glows round the pointer; a ring on each press | Behind the strip, and fixed behind About | Same | `liveGrid.ts`, `LiveGridBackground.tsx` |

## Layout and behaviour rules

The site has one main breakpoint: 640px and below is a phone, and 641px and up is desktop. These rules held across the recent rounds and should hold for anything new.

**Breakpoints**

- **641px and up:** one translucent nav bar at the top centre, the logo island to its left, and the zoom island in the bottom-right corner.
- **641–1100px:** the same, with the nav bar narrower.
- **640px and below:** the controls row at the top, the jump bar at the bottom, and solid islands.
- **480px and below:** the logo island shows the mark only.

**Consistency rules**

1. Things that sit side by side share a height: islands are 48px, pills inside them are 36px, and every card is 900px.
2. One active state everywhere: the accent container fill with on-accent-container text. Card toggles use it too.
3. Only one accent pill per island, for the action that leaves or resets the view, and at most one card toggle per card.
4. No borders on pills inside an island; hover uses `--surface-3` instead.
5. No blur. Translucency on desktop comes from 80% opacity alone.
6. Every page and card looks like the others: the same card style, widths, and gaps, with no one-off treatments.
7. A graphic that comes in two flavours (drivers or teams, finish or qualifying) shares one card, either as a card toggle or as a subsection, rather than taking a second card.

**Interaction rules**

1. Islands and card toggles own their events. Pressing, dragging, or scrolling on them never moves or zooms the cards underneath.
2. The open card's tab rests at the left of its tab strip.
3. Moving a tab strip by hand opens the tab that comes to rest at the left. A tap always beats a pending swipe.
4. Every press gets visible feedback, at the least a colour change, and an animation for buttons that change the whole page.
5. Visitors see pictures of the graphics, never a live render. Anything that changes a graphic must also re-run the capture script, or the change will not show.
6. One-off animations (the cards rising in) play once per visit and never replay on a season or theme change.

## How the code is organised

| Layer | File | What lives there |
| --- | --- | --- |
| Tokens | `src/app/globals.css` (top) | `--island-h`, `--pill-h`, `--card-h`, `--radius-island`, `--radius-pill`, `--radius-card`, `--radius-table-card`, `--radius-menu`, `--radius-menu-option`, `--island-fill`, `--shadow-island`, `--shadow-card`, `--shadow-menu`, and the colour tokens per theme and palette |
| Shapes | `src/styles/ui.css` | `.ui-island`, `.ui-pill` (`.active`, `--accent`), `.ui-icon-pill`, `.ui-logo`, `.ui-divider`, `.ui-tab-strip`, `.ui-card`, `.ui-card-header`, `.ui-card-head`, `.ui-card-toggle`, `.ui-card-views`, `.ui-card-view`, `.ui-subsection`, `.ui-menu-anchor`, `.ui-menu`, `.ui-menu-option` |
| Components | `src/components/ui/` | `Island`, `Pill`, `IconPill`, `Divider`, `TabStrip`, `Logo`, `CardHeader`, `CardToggle`, `Menu`, `MenuAnchor`, `MenuOption`, `ThemeIcon`, `PaletteIcon` (all exported from `index.ts`) |
| Controls | `src/components/` | `ThemeToggle.tsx`, `AccentToggle.tsx`, `SeasonSelector.tsx`, `HomeLogo.tsx`, built from the components above |
| Grid Walk | `src/components/gridwalk/` | `GridWalk.tsx` composes the parts; `gridwalk.css` adds only position, layout, and the phone and desktop differences; `liveGrid.ts` is the canvas |
| Pictures | `src/lib/variant-constants.ts`, `src/lib/card-snapshots.ts`, `scripts/capture-card-snapshots.mjs`, `public/card-snapshots/<season>/<palette>-<theme>/` | The theme and palette keys and cookies, the server-side picture choice, and the capture script with its weekly workflow |

Rules of thumb:

1. A new control goes inside an island as a `Pill` or `IconPill`; a new floating container is an `Island`. Neither needs new CSS for its look.
2. A card with two flavours of one graphic gets a `CardToggle` and two pictures, or a `CardHeader subsection` under the first graphic, never a second card.
3. A size, radius, or shadow is a token. If a new one is needed, add it to the token block rather than writing a literal.
4. `gridwalk.css` and `globals.css` rules say where something sits; `ui.css` rules say what it looks like. A `gw-*` rule that sets a fill, radius, or shadow is a smell.
5. Anything that changes a graphic also re-runs the capture script, or visitors will not see it.

## How we got here

The code plan from the second edition shipped as five PRs, each screenshot-diffed on desktop and phone, light and dark:

1. **Tokens** (#89, round 64): the scale became named tokens.
2. **Shared styles** (#90, round 65): `ui.css`, one class per shape. The five island copies and three tab copies became one each. Small unifications: the zoom island became 48px, Fit became an accent pill everywhere, and every pill got the same hover.
3. **Shared components** (#91, round 66): `src/components/ui/`. `TabStrip` took over both strips' logic, `Logo` replaced both logo copies, the controls were rebuilt on `Pill`, and `CardHeader` took the Tailwind and inline styles out of the card headers. The desktop theme and palette buttons became ghost pills like the tabs beside them, which the CSS had intended all along.
4. **Tidy-up** (#92, round 67): the Ember key, `ui/icons.tsx`, the dead page glow, `.logo-clearance`, and stale comments.
5. **This document** (#93, round 68).

Open question: cards (14px) and table cards (20px) still have different radii. Unifying on 20px would be a small visible change and is not done.
