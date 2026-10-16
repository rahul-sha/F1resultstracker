"use client";

export default function ResultsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Results</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
        Couldn&apos;t load results from the F1 data API right now.
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded border px-3 py-1.5 text-sm font-medium"
        style={{ borderColor: "var(--baseline)" }}
      >
        Try again
      </button>
    </div>
  );
}
