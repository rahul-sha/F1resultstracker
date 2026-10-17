export const metadata = { title: "About | F1 Results Tracker" };

function CreditIcon({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span className="credit-icon" title={title}>
      {children}
    </span>
  );
}

export default function AboutPage() {
  return (
    <div className="p-6">
      <div className="about-page-wrap">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">About</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Who built this, how, and who it&apos;s built on.
        </p>
      </div>

      <div className="about-layout">
        <section className="about table-card">
          <h2 className="mb-2.5 text-sm font-semibold">About this project</h2>
          <p>
            This is a personal F1 results tracker built by Rahul, with Claude (Anthropic&apos;s AI
            coding assistant) doing the actual design and development work — writing the code,
            mocking up and iterating on the design, fixing bugs, and wiring up the data pipeline.
            Rahul directs the project: he sets what to build, reviews every design before it goes
            live, and gives the feedback that shapes it.
          </p>
          <p>
            <strong>Why this page exists:</strong> it felt right to be upfront about that division
            of work, and to credit the data and tools this site runs on.
          </p>

          <p>
            <strong>What Claude did here:</strong>
          </p>
          <ul>
            <li>
              Designed and built the Results, Positions, and Finish Positions pages, including the
              heatmap, hover details, and the Material 3 visual style
            </li>
            <li>Built the season/colour theme system (Monokai, Coffee, Ember, Dracula)</li>
            <li>
              Wired up the F1 data pipeline, fixed data bugs (flags, team names), and built the
              historical-season caching that avoids hitting the live API repeatedly
            </li>
            <li>Every design change was mocked up and approved before going live — this page included</li>
            <li>Replaced the mobile top bar with a bottom dock nav, and added icons to the desktop nav items</li>
            <li>Fixed a Positions-page scrolling bug and tightened phone-side page margins</li>
            <li>Unified the desktop and mobile nav into one bar, the same design at every size</li>
          </ul>

          <p>
            <strong>How this has progressed:</strong>
          </p>
          <div className="timeline-inset">
            <ul className="timeline">
              <li>
                <b>Results &amp; theme toggle</b>
                <span>The first version: the race-by-race results table and a light/dark theme switch.</span>
              </li>
              <li>
                <b>Flags, hover details &amp; more themes</b>
                <span>Country flags, hover-to-see-detail cards, and the Coffee and Ember colour themes.</span>
              </li>
              <li>
                <b>Season snapshots</b>
                <span>Older seasons&apos; data got saved into the repo itself, instead of only ever being fetched live.</span>
              </li>
              <li>
                <b>Material 3 restyle</b>
                <span>The whole look moved to tonal surfaces, pill shapes and a floating top bar.</span>
              </li>
              <li>
                <b>Pinned points column &amp; data fixes</b>
                <span>The points total stays on screen while scrolling, and team-change data corrections like Lawson/Racing Bulls.</span>
              </li>
              <li>
                <b>Live-data resilience</b>
                <span>The current season now falls back to its last saved snapshot if the live F1 data API has downtime.</span>
              </li>
              <li>
                <b>Positions &amp; Finish Positions pages</b>
                <span>
                  Where each driver finished every race, sprint results shown inline, a per-position
                  finish-frequency grid with a DNF count, and a podium count for drivers and teams.
                </span>
              </li>
              <li>
                <b>Constructors section &amp; page cleanup</b>
                <span>
                  Clearer colour contrast on the Positions heatmap, Finish Positions restyled to match
                  the rest of the site, a Constructors section added to Results, and the separate
                  Standings page retired now that Results covers both.
                </span>
              </li>
              <li>
                <b>Polish pass across all three heatmap pages</b>
                <span>
                  Fixed constructor names wrapping onto two lines, DNF-cell contrast in dark themes,
                  the median-finish figure (now shown to two decimal places, with its bar scaled
                  against the real grid size), and the season selector&apos;s width changing with
                  the page it&apos;s on. Simplified the DNF count after checking that the data source
                  no longer reports a retirement&apos;s cause from the 2023 season onward. Swapped the
                  scroll-direction chevrons for a themed scrollbar sitting under the race headers.
                </span>
              </li>
              <li>
                <b>Further fixes to the heatmaps</b>
                <span>
                  Removed a boxy border that was meant to highlight a driver&apos;s most frequent
                  finish on Finish Positions &mdash; the brightest shade already does that job.
                  Fixed the Teams podium bar so its length is proportional to the podium count
                  rather than two different totals both hitting the same width cap. Results now
                  shows a score of 1 or 2 points with a faint tint distinct from scoring nothing,
                  rather than both looking identical.
                </span>
              </li>
              <li>
                <b>Security review</b>
                <span>
                  Checked the site over for common security issues. Found and fixed one real
                  one: the automated data-snapshot job built a command from its input text
                  directly, which a malicious input could have hijacked to run its own commands.
                  Everything else &mdash; secrets, dependencies, data handling, the site&apos;s
                  one use of raw HTML &mdash; checked out safe. Added a few standard browser
                  security headers while at it.
                </span>
              </li>
              <li>
                <b>Positions merged with Finish Positions</b>
                <span>
                  The separate Finish Positions page is gone &mdash; its finish-frequency grid
                  and podium counts now sit underneath the per-race grid on Positions. Results
                  also marks pole position and fastest lap with a small superscript next to the
                  points value, the same treatment as the sprint-result superscript. Removed the
                  hover tooltip from the Constructors heatmap on Results.
                </span>
              </li>
              <li>
                <b>Centred layout, global season selector</b>
                <span>
                  Results and Positions no longer hug the left edge with empty space on the
                  right on wide screens. The season selector moved out of each page and into
                  the top nav bar, and the season you pick now stays selected as you move
                  between pages instead of resetting.
                </span>
              </li>
              <li>
                <b>Bottom dock nav on mobile, nav icons on desktop</b>
                <span>
                  On narrow screens the top bar is now a floating bottom dock with Results and
                  Positions as the two main tabs, the season selector and an About shortcut
                  built in, and a hamburger that opens a sheet for the theme and light/dark
                  toggles. The desktop top bar gained matching icons next to its nav labels, and
                  the race-header scrollbar on Results and Positions was narrowed so it no longer
                  spans the full width of the table.
                </span>
              </li>
              <li>
                <b>Mobile heatmap fixes</b>
                <span>
                  Fixed the coloured cells painting past the table card&apos;s rounded corners on
                  phones. Shrunk the points/positions cells and race-header chips on narrow
                  screens so more races fit on screen before you need to scroll.
                </span>
              </li>
              <li>
                <b>Positions scroll fix &amp; tighter phone margins</b>
                <span>
                  Fixed the Positions page&apos;s finish-frequency grid overlapping its own DNFs
                  column &mdash; it now scrolls horizontally like every other table on the site.
                  Reduced the page&apos;s left/right margin on phones from a fixed amount to 5%
                  of the screen width, so it no longer feels cramped.
                </span>
              </li>
              <li>
                <b>One nav bar, same design everywhere</b>
                <span>
                  Replaced the separate desktop top bar and mobile dock with a single floating
                  bar used at every screen size: Results, Positions and About sit in a
                  horizontally scrollable strip and the season selector stays pinned beside them.
                  The hamburger menu grows the bar itself into a panel holding the theme and
                  palette toggles, instead of opening a separate sheet.
                </span>
              </li>
              <li>
                <b>Nav bar polish</b>
                <span>
                  On phones every tab is now icon-only, including the active one, so the bar
                  stays the same width from page to page instead of shifting with the active
                  label. Fixed the season menu rendering invisibly behind the page. On wide
                  screens the bar now sits at the top (its hamburger panel opens downward to
                  match), and the About page&apos;s content now matches the width of Results and
                  Positions instead of reading narrower.
                </span>
              </li>
              <li>
                <b>Drag-to-pan tables &amp; a Dracula theme</b>
                <span>
                  Removed the themed scrollbar under the race headers — a table that overflows
                  now pans by clicking and dragging on desktop, or the normal touch scroll on
                  phones. Shrunk the gap between the nav bar and the page content on wide
                  screens, and added icons to the Theme and Palette toggles. Added a fourth
                  colour palette, Dracula.
                </span>
              </li>
              <li>
                <b>Consistent cell sizes and a background glow</b>
                <span>
                  Fixed the Positions page&apos;s finish-frequency grid shrinking its own
                  cells on narrow screens so they now match Results&apos; size exactly. Brought
                  back the Results and Positions page headings at the same size as the site&apos;s
                  other section headings. Fixed the season pill in the nav bar showing a stale
                  year after following a nav link to another page rather than a season link.
                  Evened out the padding below the Theme/Palette row in the nav bar&apos;s
                  hamburger panel. Added a soft theme-coloured gradient behind every page instead
                  of a single flat background colour.
                </span>
              </li>
              <li>
                <b>Rounded corners back, a moving gradient, and a Dracula light mode</b>
                <span>
                  Brought the rounded corner back on the heatmap tables — it reads better than the
                  squared-off edge did, even with the odd bleeding cell on some phones. The
                  background glow now drifts slowly instead of sitting still. Dracula previously
                  only had a dark variant; it now has a proper light one too, and the appearance
                  menu correctly restores the chosen palette after a page reload (a Dracula-shaped
                  gap in the restore logic meant it fell back to the default palette before). Also
                  matched the season selector&apos;s height to the other nav bar buttons.
                </span>
              </li>
              <li>
                <b>Faster background, glassmorphism, and tooltip/cursor fixes</b>
                <span>
                  Sped up the drifting background glow by a fifth. Gave the nav bar and every
                  table card a blurred, translucent glass look so the background shows through
                  them. Added a thin dashed line after 10th place on the finish-frequency grid,
                  marking where points stop being awarded. Removed the question-mark cursor from
                  heatmap cells, and fixed the hover tooltip staying stuck in place — rather than
                  following the cell — if you scrolled while hovering. Also removed the page-switch
                  entrance animation, which read as jumpy rather than smooth.
                </span>
              </li>
              <li>
                <b>A proper glass effect, and tighter phone margins</b>
                <span>
                  The glass treatment from the previous update read as plain transparency rather
                  than blur, so it now has a stronger blur, lower opacity, and a faint highlight,
                  which visibly softens what&apos;s behind the nav bar and table cards. The
                  race-header flags no longer sit in their own solid boxed chip &mdash; they now
                  sit flush on the table like everything else. Phone-screen side margins are
                  narrower too, so more of the table fits without scrolling.
                </span>
              </li>
            </ul>
          </div>

          <p>
            <strong>Design inspiration:</strong>
          </p>
          <div className="credit-grid">
            <div className="credit">
              <CreditIcon title="Generic icon — no official Tableau logo used">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M5 19V11M12 19V5M19 19V13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </CreditIcon>
              <span>
                <b>Mateusz Karmalski</b>
                <a
                  href="https://public.tableau.com/app/profile/mateusz.karmalski/viz/F1ResultsTracker/Results"
                  target="_blank"
                  rel="noopener"
                >
                  &quot;F1 Results Tracker&quot; on Tableau Public
                </a>{" "}
                — the results-heatmap layout this site is based on
              </span>
            </div>
            <div className="credit">
              <CreditIcon>
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M4 7a8 8 0 1116 0M4 7v10a8 8 0 0016 0V7" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                </svg>
              </CreditIcon>
              <span>
                <b>Material 3</b>Google&apos;s open design system — the tonal surfaces, pill shapes and
                layout language this site follows
              </span>
            </div>
            <div className="credit">
              <CreditIcon>
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.2" />
                  <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </CreditIcon>
              <span>
                <b>Monokai</b>Colour scheme by Wimer Hazenberg — our default theme borrows its name
                and palette
              </span>
            </div>
          </div>

          <p style={{ marginTop: 18 }}>
            This is an independent fan project — not affiliated with Formula 1, the FIA, or any
            team.
          </p>
        </section>

        <aside className="about-side">
          <section className="about table-card">
            <h2 className="mb-2.5 text-sm font-semibold">About me</h2>
            <p className="about-tag">Placeholder — to be finalised later</p>
            <p>
              <strong>Rahul</strong> is the person behind this site — an F1 fan who wanted a
              cleaner way to follow race results and standings than what was out there, and ended
              up building one. By day, just someone who likes tinkering with side projects; by
              race weekend, fully invested in the midfield battle as much as the win. Directs
              every design and feature decision on this site, with Claude doing the actual
              implementation.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
              (Made up as a stand-in — swap in a real bio, links, or whatever you&apos;d like said
              here whenever you get to it.)
            </p>
          </section>

          <section className="about table-card">
            <h2 className="mb-2.5 text-sm font-semibold">Data &amp; tools this site is built on</h2>
            <div className="credit-grid credit-grid-single">
              <div className="credit">
                <CreditIcon>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M4 5h16M4 12h16M4 19h7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    <path d="M15 16l3 3 3-3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </CreditIcon>
                <span>
                  <b>Jolpica F1 API</b>Race, standings &amp; results data
                </span>
              </div>
              <div className="credit">
                <CreditIcon>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M6 20V4M6 4h11l-2.5 3.5L17 11H6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </CreditIcon>
                <span>
                  <b>flag-icons</b>Country flag SVGs
                </span>
              </div>
              <div className="credit">
                <CreditIcon>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M9 7l-4 5 4 5M15 7l4 5-4 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </CreditIcon>
                <span>
                  <b>Next.js &amp; React</b>App framework
                </span>
              </div>
              <div className="credit">
                <CreditIcon>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M6 17a4 4 0 010-8 5 5 0 019.6-1.5A4 4 0 0118 17H6z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                  </svg>
                </CreditIcon>
                <span>
                  <b>Vercel</b>Hosting
                </span>
              </div>
              <div className="credit">
                <CreditIcon>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 3l1.8 5.6L19 10l-5.2 1.4L12 17l-1.8-5.6L5 10l5.2-1.4L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                </CreditIcon>
                <span>
                  <b>Claude Code</b>Design &amp; development
                </span>
              </div>
              <div className="credit">
                <CreditIcon>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.1 3.1 0 00-.9-2.4c3-.3 6-1.6 6-6.7A5.1 5.1 0 0019.6 5c.5-1.1.5-2.3 0-3.5 0 0-1.3-.3-3.6 1.3a12.3 12.3 0 00-6 0C7.7 1.2 6.4 1.5 6.4 1.5c-.5 1.2-.5 2.4 0 3.5A5.1 5.1 0 004.9 8.3c0 5.1 3 6.4 6 6.7a3.1 3.1 0 00-.9 2.4V21"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </CreditIcon>
                <span>
                  <b>Source code</b>
                  <a href="https://github.com/rahul-sha/F1resultstracker" target="_blank" rel="noopener">
                    View on GitHub
                  </a>{" "}
                  — private for now, may open up later
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
      </div>
    </div>
  );
}
