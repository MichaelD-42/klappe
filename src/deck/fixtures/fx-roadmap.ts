import { assembleDeck } from "../assemble";
import { roadmap, type RoadmapHandle, type RoadmapOpts } from "klappe/fx";
import type { SceneModule, StepAdder } from "../../types";

// A German deck: show, milestones one per step, the today marker moving between them, and one move outside
// the axis (the fixture's only problem; the marker stops at the axis end). A third scene builds its move adders out
// of step order: the move to December is built before the move to October.
const rect = { x: 160, y: 160, w: 1600, h: 760 };
const milestones: RoadmapOpts["milestones"] = [
  { id: "kick", date: "2026-07-01", label: "Kick-off" },
  { id: "beta", date: "2026-09-15", label: "Beta für erste Kunden" },
  { id: "ga", date: "2026-12-01", label: "Marktstart" },
];
const md = (title: string, n: number) => `## ${title}\n\n${Array.from({ length: n }, (_, i) => `- Schritt ${i + 1}.\n`).join("")}`;
type R = { r: RoadmapHandle };

const walk: SceneModule = {
  build: (ctx) => ({ r: roadmap(ctx, { ...rect, milestones, today: "2026-07-20" }) }),
  steps: [
    (tl, r: R) => r.r.show(tl),
    (tl, r: R) => r.r.reveal("kick")(tl),
    (tl, r: R) => r.r.reveal("beta")(tl),
    (tl, r: R) => r.r.move("2026-10-24")(tl),
    (tl, r: R) => r.r.reveal("ga")(tl),
    (tl, r: R) => r.r.move("2026-12-10")(tl),
  ],
};
const outside: SceneModule = {
  build: (ctx) => ({ r: roadmap(ctx, { ...rect, milestones, today: "2026-07-20" }) }),
  steps: [(tl, r: R) => r.r.show(tl), (tl, r: R) => r.r.move("2027-06-01")(tl)],
};
const early: SceneModule = {
  build: (ctx) => {
    const r = roadmap(ctx, { ...rect, milestones, today: "2026-07-20" });
    const late = r.move("2026-12-10");
    return { r, late, first: r.move("2026-10-24") };
  },
  steps: [(tl, r: R) => r.r.show(tl), (tl, r: { first: StepAdder }) => r.first(tl), (tl, r: { late: StepAdder }) => r.late(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\nlang: de\n---\n",
      "sections/10-a/section.md": "# Roadmap\n",
      "sections/10-a/10-walk/scene.md": md("Meilensteine", 6),
      "sections/10-a/20-outside/scene.md": md("Außerhalb", 2),
      "sections/10-a/30-early/scene.md": md("Früh gebaut", 3),
    },
    { "sections/10-a/10-walk/scene.ts": walk, "sections/10-a/20-outside/scene.ts": outside, "sections/10-a/30-early/scene.ts": early },
  );
