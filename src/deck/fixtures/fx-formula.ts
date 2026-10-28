import { assembleDeck } from "../assemble";
import { formula, type FormulaHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// An equation that builds in three terms, the second's adder made before the first's (they still build in reading
// order), then a next() past the last term; a TeX error and a formula too wide to fit (the three problems).
const md = (title: string, n: number) => `## ${title}\n\n${"- Step.\n".repeat(n)}`;
type R = { f: FormulaHandle; a: any; b: any };
const build: SceneModule = {
  build: (ctx) => {
    const f = formula(ctx, { tex: String.raw`E = \step{mc^2} \step{+ \frac{1}{2}mv^2} \step{+ U}`, x: 160, y: 340, w: 1600, h: 400 });
    const b = f.next();
    const a = f.next();
    return { f, a, b };
  },
  steps: [(tl, r: R) => r.f.show(tl), (tl, r: R) => r.b(tl), (tl, r: R) => r.a(tl), (tl, r: R) => r.f.next()(tl), (tl, r: R) => r.f.next()(tl)],
};
const broken: SceneModule = {
  build: (ctx) => ({
    bad: formula(ctx, { tex: String.raw`\frac{1}{`, x: 160, y: 160, w: 1600, h: 200 }),
    wide: formula(ctx, { tex: Array.from({ length: 10 }, (_, i) => `x_{${i}}`).join("+"), x: 760, y: 600, w: 400, h: 100 }),
  }),
  steps: [(tl, r: { bad: FormulaHandle; wide: FormulaHandle }) => (r.bad.show(tl), r.wide.show(tl))],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Formula\n",
      "sections/10-a/10-build/scene.md": md("Build", 5),
      "sections/10-a/20-broken/scene.md": md("Broken", 1),
    },
    { "sections/10-a/10-build/scene.ts": build, "sections/10-a/20-broken/scene.ts": broken },
  );
