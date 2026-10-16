"use client";

import { useRouter } from "next/navigation";

export default function StandingsError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  function tryAgain() {
    // reset() alone can leave this segment showing stale cached data after
    // a fetch error; refreshing the route forces a real re-fetch too.
    router.refresh();
    reset();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Standing</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
        Couldn&apos;t load standings from the F1 data API right now.
      </p>
      <button
        onClick={tryAgain}
        className="mt-4 rounded border px-3 py-1.5 text-sm font-medium"
        style={{ borderColor: "var(--baseline)" }}
      >
        Try again
      </button>
    </div>
  );
}
