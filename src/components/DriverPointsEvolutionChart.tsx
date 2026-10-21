"use client";

import type { PointsGrid } from "@/lib/points-grid";
import PointsEvolutionChart from "./PointsEvolutionChart";

export default function DriverPointsEvolutionChart({ grid }: { grid: PointsGrid }) {
  const series = grid.rows.map((row) => ({
    id: row.driverId,
    label: `${row.name} (${row.constructorName})`,
    code: row.code,
    color: row.color,
    pointsByRound: row.pointsByRound.map((cell) => cell?.points ?? null),
  }));

  return <PointsEvolutionChart columns={grid.columns} series={series} />;
}
