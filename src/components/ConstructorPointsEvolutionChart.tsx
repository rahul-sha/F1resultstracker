"use client";

import type { ConstructorPointsGrid } from "@/lib/constructor-points-grid";
import PointsEvolutionChart from "./PointsEvolutionChart";

export default function ConstructorPointsEvolutionChart({ grid }: { grid: ConstructorPointsGrid }) {
  const series = grid.rows.map((row) => ({
    id: row.constructorId,
    label: row.name,
    color: row.color,
    pointsByRound: row.pointsByRound.map((cell) => cell?.points ?? null),
  }));

  return <PointsEvolutionChart columns={grid.columns} series={series} />;
}
