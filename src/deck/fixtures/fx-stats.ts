import { assembleDeck } from "../assemble";
import { kpi, progress, waffle, type StatHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// Board numbers: two KPI tiles (one up and good, one up and bad because lower is better), a waffle, a progress
// ring short of its target and one past it. All numbers are made-up sample data.
const all: SceneModule = {
  build: (ctx) => [
    kpi(ctx, { x: 120, y: 120, value: 1284, label: "Orders", previous: 1146, spark: [980, 1020, 1100, 1146, 1210, 1284], source: "klappe demo sample" }),
    kpi(ctx, { x: 660, y: 120, value: 14.5, unit: "days", label: "Lead time", previous: 12.5, better: "down", spark: [11, 12, 12.5, 13.5, 14.5] }),
    waffle(ctx, { x: 1240, y: 120, size: 400, value: 37, label: "of releases had a rollback", source: "klappe demo sample" }),
    progress(ctx, { x: 160, y: 620, size: 300, value: 72, target: 100, label: "Migration" }),
    progress(ctx, { x: 620, y: 620, size: 300, value: 130, target: 120, label: "Hires" }),
  ],
  steps: [(tl, s: StatHandle[]) => s.forEach((h) => h.show(tl))],
};

export default () =>
  assembleDeck(
    { "deck.md": "---\ntitle: Fixture\n---\n", "sections/10-a/section.md": "# Stats\n", "sections/10-a/10-all/scene.md": "## All\n\n- Everything.\n" },
    { "sections/10-a/10-all/scene.ts": all },
  );
