import { assembleDeck } from "../assemble";
import { layerStack, type LayerStackHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// Four layers: built, pulled apart, two lit in turn, closed up; then light(7) past the last layer and a label too
// long for its column (the fixture's two problems).
const md = (title: string, n: number) => `## ${title}\n\n${"- Step.\n".repeat(n)}`;
const layers = [
  { label: "Apps", note: "What people use" },
  { label: "Services", note: "Business rules" },
  { label: "Data", note: "One store per service" },
  { label: "Platform" },
];
type R = { s: LayerStackHandle };
const stack: SceneModule = {
  build: (ctx) => ({ s: layerStack(ctx, { layers, x: 160, y: 120, w: 1600, h: 760 }) }),
  steps: [(tl, r: R) => r.s.show(tl), (tl, r: R) => r.s.apart(tl), (tl, r: R) => r.s.light(1)(tl), (tl, r: R) => r.s.light(2)(tl), (tl, r: R) => r.s.together(tl)],
};
const bad: SceneModule = {
  build: (ctx) => ({ s: layerStack(ctx, { layers: [{ label: "A layer name far too long for the narrow label column" }, { label: "B" }], x: 560, y: 200, w: 800, h: 600 }) }),
  steps: [(tl, r: R) => r.s.show(tl), (tl, r: R) => r.s.light(7)(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Layers\n",
      "sections/10-a/10-stack/scene.md": md("Stack", 5),
      "sections/10-a/20-bad/scene.md": md("Bad", 2),
    },
    { "sections/10-a/10-stack/scene.ts": stack, "sections/10-a/20-bad/scene.ts": bad },
  );
