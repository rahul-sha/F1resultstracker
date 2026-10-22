import type { PodiumCounts } from "@/lib/finish-positions";

interface PodiumEntry {
  label: string;
  team?: string;
  color: string;
  podiums: PodiumCounts;
}

const PLACE_SHADE: Record<1 | 2 | 3, string> = {
  1: "var(--heat-6)",
  2: "var(--heat-4)",
  3: "var(--heat-2)",
};
const PLACE_FG: Record<1 | 2 | 3, string> = {
  1: "var(--heat-fg-hi)",
  2: "var(--heat-fg-hi)",
  3: "var(--heat-fg-lo)",
};

// .podium-track is the flex item that actually shrinks to fit the row
// (fixed flex-basis, so every row shrinks by the same factor regardless of
// its own total); .podium-bar sits inside it at a percentage width, so the
// bar is always proportional to the track's real rendered width, whether
// that's the full 420px on desktop or squeezed down on a narrow phone. A
// percentage width directly on the flex item itself doesn't work: it
// resolves against the row's available space after the label and total,
// which varies, so two very different totals could both get clamped to
// the same rendered length once they exceed that space (see mobile-margins
// memory's note on this file for the symptom that gave this away).
function PodiumRow({ entry, maxTotal }: { entry: PodiumEntry; maxTotal: number }) {
  const total = entry.podiums[1] + entry.podiums[2] + entry.podiums[3];
  const widthPct = Math.max(6, (total / maxTotal) * 100);

  return (
    <div className="podium-row">
      <div className="podium-label">
        <span className="podium-swatch" style={{ background: entry.color }} />
        {entry.label}
      </div>
      <div className="podium-track">
        <div className="podium-bar" style={{ width: `${widthPct}%` }}>
          {([1, 2, 3] as const).map((place) =>
            entry.podiums[place] ? (
              <div
                key={place}
                className="podium-seg"
                style={{
                  background: PLACE_SHADE[place],
                  color: PLACE_FG[place],
                  flex: entry.podiums[place] / total,
                }}
              >
                {entry.podiums[place]}
              </div>
            ) : null
          )}
        </div>
      </div>
      <span className="podium-total">{total}</span>
    </div>
  );
}

export default function PodiumBars({
  drivers,
  teams,
}: {
  drivers: PodiumEntry[];
  teams: PodiumEntry[];
}) {
  const maxTotal = Math.max(
    1,
    ...drivers.map((d) => d.podiums[1] + d.podiums[2] + d.podiums[3]),
    ...teams.map((t) => t.podiums[1] + t.podiums[2] + t.podiums[3])
  );

  return (
    <div className="table-card podium-card">
      <div className="podium-legend">
        <span>
          <span className="podium-swatch" style={{ background: "var(--heat-6)" }} />
          1st
        </span>
        <span>
          <span className="podium-swatch" style={{ background: "var(--heat-4)" }} />
          2nd
        </span>
        <span>
          <span className="podium-swatch" style={{ background: "var(--heat-2)" }} />
          3rd
        </span>
      </div>

      {drivers.length === 0 && teams.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No podium finishes yet this season.
        </p>
      ) : null}

      {drivers.length > 0 ? (
        <>
          <p className="podium-subhead">Drivers</p>
          <div>
            {drivers.map((d) => (
              <PodiumRow key={d.label} entry={d} maxTotal={maxTotal} />
            ))}
          </div>
        </>
      ) : null}

      {teams.length > 0 ? (
        <>
          {drivers.length > 0 ? <div className="podium-divider" /> : null}
          <p className="podium-subhead">Teams</p>
          <div>
            {teams.map((t) => (
              <PodiumRow key={t.label} entry={t} maxTotal={maxTotal} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
