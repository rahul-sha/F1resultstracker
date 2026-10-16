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
      <div className="mb-4">
        <h1 className="text-2xl font-bold">About</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Who built this, how, and who it&apos;s built on.
        </p>
      </div>

      <div className="flex flex-col gap-6" style={{ maxWidth: 760 }}>
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
              Designed and built the Results and Standings pages, including the heatmap, hover
              details, and the Material 3 visual style
            </li>
            <li>Built the season/colour theme system (Monokai, Coffee, Ember)</li>
            <li>
              Wired up the F1 data pipeline, fixed data bugs (flags, team names), and built the
              historical-season caching that avoids hitting the live API repeatedly
            </li>
            <li>Every design change was mocked up and approved before going live — this page included</li>
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

          <p>
            <strong>Data &amp; tools this site is built on:</strong>
          </p>
          <div className="credit-grid">
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

          <p style={{ marginTop: 14 }}>
            This is an independent fan project — not affiliated with Formula 1, the FIA, or any
            team.
          </p>
        </section>

        <section className="about table-card">
          <h2 className="mb-2.5 text-sm font-semibold">About me</h2>
          <p className="about-tag">Placeholder — to be finalised later</p>
          <p>
            <strong>Rahul</strong> is the person behind this site — an F1 fan who wanted a cleaner
            way to follow race results and standings than what was out there, and ended up
            building one. By day, just someone who likes tinkering with side projects; by race
            weekend, fully invested in the midfield battle as much as the win. Directs every
            design and feature decision on this site, with Claude doing the actual implementation.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 12.5 }}>
            (Made up as a stand-in — swap in a real bio, links, or whatever you&apos;d like said
            here whenever you get to it.)
          </p>
        </section>
      </div>
    </div>
  );
}
