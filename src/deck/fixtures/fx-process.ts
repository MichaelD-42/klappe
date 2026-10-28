import { assembleDeck } from "../assemble";
import { processSteps, type ProcessStepsHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// Five stages lit one after another, back to the first and with its to(3) adder made before to(1); a bar whose
// stage name cannot fit, and a to(9) past the last stage (the fixture's two problems).
const md = (title: string, n: number) => `## ${title}\n\n${"- Step.\n".repeat(n)}`;
const stages = ["Plan", "Build", "Test", "Release", "Learn"];
type R = { p: ProcessStepsHandle };

const walk: SceneModule = {
  build: (ctx) => {
    const p = processSteps(ctx, { steps: stages, x: 160, y: 460, w: 1600, h: 120 });
    const [three, one] = [p.to(3), p.to(1)];
    return { p, three, one };
  },
  steps: [(tl, r: R) => r.p.show(tl), (tl, r: any) => r.one(tl), (tl, r: any) => r.three(tl), (tl, r: R) => r.p.to(0)(tl)],
};
const tight: SceneModule = {
  build: (ctx) => ({ p: processSteps(ctx, { steps: ["One", "A stage name far too long for its chevron", "Three"], x: 560, y: 460, w: 800, h: 100, current: 2 }) }),
  steps: [(tl, r: R) => r.p.show(tl), (tl, r: R) => r.p.to(9)(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Process\n",
      "sections/10-a/10-walk/scene.md": md("Walk", 4),
      "sections/10-a/20-tight/scene.md": md("Tight", 2),
    },
    { "sections/10-a/10-walk/scene.ts": walk, "sections/10-a/20-tight/scene.ts": tight },
  );
