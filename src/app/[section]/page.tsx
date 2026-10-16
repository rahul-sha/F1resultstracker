const SECTION_TITLES: Record<string, string> = {
  results: "Results",
  positions: "Positions",
  flat: "F.L.A.T.",
  quali: "Quali",
  "grid-vs-race": "Grid vs Race",
  teams: "Teams",
  drivers: "Drivers",
  "per-race": "Per Race",
  indicators: "Indicators",
  "head-to-head": "Head to Head",
  calendar: "Calendar",
};

export default async function ComingSoonPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const title = SECTION_TITLES[section] ?? section;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
        This section is coming soon. Check out Points or Standing for now.
      </p>
    </div>
  );
}
