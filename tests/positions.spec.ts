import { test, expect } from "@playwright/test";

// The /positions page streams four independent sections in via Suspense
// (see src/app/positions/page.tsx): the finish-position heatmap, finish
// frequency, qualifying frequency, and podium bars. Each has its own
// loading fallback, so this checks every section actually resolves with
// real data rather than being stuck on its fallback.
test("positions page renders all four sections with data", async ({ page }) => {
  await page.goto("/positions");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "Positions", level: 1 })).toBeVisible();

  // Finish-position heatmap: first table on the page, one row per driver.
  const heatmapTable = page.locator("table").first();
  await expect(heatmapTable).toBeVisible();
  await expect(heatmapTable.locator("tbody tr")).not.toHaveCount(0);

  // Finish frequency section.
  const finishHeading = page.getByRole("heading", { name: "Finish frequency" });
  await expect(finishHeading).toBeVisible();

  // Qualifying frequency section (absent for a season with no qualifying
  // data at all, but present for any season from 2020 onward per
  // FIRST_SEASON in season-constants.ts).
  const qualifyingHeading = page.getByRole("heading", { name: "Qualifying frequency" });
  await expect(qualifyingHeading).toBeVisible();

  // Podium finishes section.
  const podiumHeading = page.getByRole("heading", { name: "Podium finishes" });
  await expect(podiumHeading).toBeVisible();

  // No section should be stuck on its loading fallback text.
  await expect(page.getByText("Loading…", { exact: true })).toHaveCount(0);
});
