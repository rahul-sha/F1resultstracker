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
    <div className="px-[10px] py-6 sm:p-6">
      <div className="about-page-wrap">
      <div className="page-header">
        <h1 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          About
        </h1>
        <p className="text-sm">Who built this, how, and who it&apos;s built on.</p>
      </div>

      <div className="about-layout">
        <section id="about-project" data-rail-label="About this project" className="about table-card">
          <h2 className="mb-2.5 text-sm font-semibold">About this project</h2>
          <p>
            This is a personal F1 results tracker built by one person, with Claude (Anthropic&apos;s
            AI coding assistant) doing the actual design and development work — writing the code,
            mocking up and iterating on the design, fixing bugs, and wiring up the data pipeline.
            That person directs the project: setting what to build, reviewing every design before
            it goes live, and giving the feedback that shapes it.
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
            <li>
              Added a scroll-aware section rail, a sprint marker you can actually see, and an
              overscroll gesture that springs to the next page
            </li>
            <li>
              Added a share button to every graphic, so it can be saved, copied or shared
              straight from the page
            </li>
            <li>
              Added cumulative Driver and Constructors Points Evolution charts to the Results
              page, each full width with its own points-total pill beside every line instead of
              a numeric y-axis, and the whole chart draws itself in, race by race, left to right,
              the first time it scrolls into view
            </li>
          </ul>

          <p>
            <strong>How this has progressed:</strong>
          </p>
          <p className="timeline-count">
            36 rounds shipped since launch &mdash; most recent first. Minor polish-only rounds are
            folded into the ones around them rather than listed separately.
          </p>
          <div className="timeline-inset">
            <ul className="timeline">
              <li>
                <span className="seq">36</span>
                <b>Evolution charts: full width, full field, real sweep</b>
                <span>
                  Fixed a mobile layout bug on both evolution charts, split them back into
                  separate full-width sections, grew the chart height so every driver and team
                  gets its own points pill instead of cropping the field, and replaced the
                  per-line fade-in with a single steady left-to-right sweep across the whole
                  chart.
                </span>
              </li>
              <li>
                <span className="seq">35</span>
                <b>No-axis evolution charts, points bubbles</b>
                <span>
                  Replaced the numeric y-axis on both evolution charts with a small points-total
                  pill at the end of each line, nudged apart with a leader line when two drivers
                  are close.
                </span>
              </li>
              <li>
                <span className="seq">34</span>
                <b>Constructors evolution chart, scroll animation</b>
                <span>
                  A matching Constructors Points Evolution chart sits beside the driver one instead
                  of full width, and both now draw themselves in, round by round, as you scroll to them.
                </span>
              </li>
              <li>
                <span className="seq">33</span>
                <b>Driver Points Evolution chart</b>
                <span>
                  A cumulative points line chart under the Results heatmap, one line per driver
                  with race flags along the x-axis.
                </span>
              </li>
              <li>
                <span className="seq">32</span>
                <b>Real bio, timeline tidy-up</b>
                <span>Added the real About me bio, compacted this timeline, and tinted the credit icons.</span>
              </li>
              <li>
                <span className="seq">31</span>
                <b>Share button on every graphic</b>
                <span>
                  A share icon beside each heatmap, grid and chart turns it into a PNG right in the
                  browser &mdash; save it, copy it, or open the native share sheet on phone and Mac.
                </span>
              </li>
              <li>
                <span className="seq">30</span>
                <b>Sprint marker, header cards, section rail &amp; overscroll navigation</b>
                <span>
                  Fixed the sprint-race marker, gave page titles a matching glass card, added a
                  scroll-aware section rail, and made reaching the page bottom spring to the next page.
                </span>
              </li>
              <li>
                <span className="seq">29</span>
                <b>First automated test, fewer duplicate data requests</b>
                <span>A Playwright test for Positions, and live-fetch calls now shared instead of duplicated.</span>
              </li>
              <li>
                <span className="seq">28</span>
                <b>Agent skills added</b>
                <span>frontend-design, webapp-testing and vercel-react-best-practices, reviewed and installed.</span>
              </li>
              <li>
                <span className="seq">26</span>
                <b>Qualifying frequency heatmap</b>
                <span>Ranked by average qualifying position rather than the standings; backfilled for 2020&ndash;2026.</span>
              </li>
              <li>
                <span className="seq">22</span>
                <b>Glassmorphism</b>
                <span>The nav bar and table cards got a blurred, translucent glass look.</span>
              </li>
              <li>
                <span className="seq">21</span>
                <b>Dracula light mode, a drifting background</b>
                <span>Dracula gained a light variant; the background glow now drifts instead of sitting still.</span>
              </li>
              <li>
                <span className="seq">20</span>
                <b>A soft background glow</b>
                <span>Added a theme-coloured gradient behind every page instead of a flat colour.</span>
              </li>
              <li>
                <span className="seq">19</span>
                <b>Drag-to-pan tables, a Dracula theme</b>
                <span>Overflowing tables now pan by click-and-drag; added a fourth colour palette.</span>
              </li>
              <li>
                <span className="seq">17</span>
                <b>One nav bar, same design everywhere</b>
                <span>The separate desktop bar and mobile dock merged into a single bar at every size.</span>
              </li>
              <li>
                <span className="seq">14</span>
                <b>Bottom dock nav on mobile, nav icons on desktop</b>
                <span>Narrow screens got a floating bottom dock; the desktop bar gained matching icons.</span>
              </li>
              <li>
                <span className="seq">13</span>
                <b>Centred layout, global season selector</b>
                <span>Pages centre on wide screens; the season you pick now persists across pages.</span>
              </li>
              <li>
                <span className="seq">12</span>
                <b>Positions merged with Finish Positions</b>
                <span>One page now; pole and fastest lap marked with a superscript on Results too.</span>
              </li>
              <li>
                <span className="seq">11</span>
                <b>Security review</b>
                <span>Found and fixed a script-injection bug in the data-snapshot job; added security headers.</span>
              </li>
              <li>
                <span className="seq">9</span>
                <b>Polish pass across the heatmap pages</b>
                <span>Simplified DNF counts to match how the data source reports them from 2023 onward.</span>
              </li>
              <li>
                <span className="seq">8</span>
                <b>Constructors section &amp; page cleanup</b>
                <span>Added Constructors to Results; retired the separate Standings page.</span>
              </li>
              <li>
                <span className="seq">7</span>
                <b>Positions &amp; Finish Positions pages</b>
                <span>Per-race finishes, a finish-frequency grid, and podium counts for drivers and teams.</span>
              </li>
              <li>
                <span className="seq">6</span>
                <b>Live-data resilience</b>
                <span>The current season falls back to its last saved snapshot if the live API has downtime.</span>
              </li>
              <li>
                <span className="seq">5</span>
                <b>Pinned points column &amp; data fixes</b>
                <span>The points total stays on screen while scrolling; corrected team-change data.</span>
              </li>
              <li>
                <span className="seq">4</span>
                <b>Material 3 restyle</b>
                <span>The whole look moved to tonal surfaces, pill shapes and a floating top bar.</span>
              </li>
              <li>
                <span className="seq">3</span>
                <b>Season snapshots</b>
                <span>Older seasons&apos; data saved into the repo instead of only ever fetched live.</span>
              </li>
              <li>
                <span className="seq">2</span>
                <b>Flags, hover details &amp; more themes</b>
                <span>Country flags, hover-to-see-detail cards, and the Coffee and Ember colour themes.</span>
              </li>
              <li>
                <span className="seq">1</span>
                <b>Results &amp; theme toggle</b>
                <span>The first version: the race-by-race results table and a light/dark theme switch.</span>
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
          <section id="about-me" data-rail-label="About me" className="about table-card">
            <h2 className="mb-2.5 text-sm font-semibold">About me</h2>
            <p>
              This site is built and run by one person — an F1 fan who wanted a cleaner way to
              follow race results and standings than what was out there, and ended up building
              one. By day, just someone who likes tinkering with side projects; by race weekend,
              fully invested in the midfield battle as much as the win. Directs every design and
              feature decision on this site, with Claude doing the actual implementation.
            </p>
          </section>

          <section id="about-tools" data-rail-label="Data & tools" className="about table-card">
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
