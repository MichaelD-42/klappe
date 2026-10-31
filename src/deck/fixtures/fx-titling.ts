import { chart, endRoll, kpi, lowerThird } from "klappe/fx";
import type { Ctx } from "../../types";
import { assembleDeck } from "../assemble";

// lowerThird in and out; two charts with `# source:` lines (one used twice), a KPI with a source and one without, then the end roll.
const rect = { x: 160, y: 120, w: 1600, h: 840 };
const bar = (src: string) => ({ build: (ctx: Ctx) => chart(ctx, { type: "bar", src, rect }), steps: [(tl: gsap.core.Timeline, c: ReturnType<typeof chart>) => c.grow(tl)] });

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-name/scene.md": "## Name\n\n- In.\n- Out.\n",
      "sections/10-a/20-one/scene.md": "## One\n",
      "sections/10-a/30-two/scene.md": "## Two\n",
      "sections/10-a/40-again/scene.md": "## Again\n",
      "sections/10-a/50-kpi/scene.md": "## Kpi\n",
      "sections/10-a/60-roll/scene.md": "## Roll\n",
    },
    {
      "sections/10-a/10-name/scene.ts": {
        build: (ctx: Ctx) => lowerThird(ctx, { name: "Ada Lovelace", role: "Analyst" }),
        steps: [(tl: gsap.core.Timeline, l: ReturnType<typeof lowerThird>) => l.show(tl), (tl: gsap.core.Timeline, l: ReturnType<typeof lowerThird>) => l.hide(tl)],
      },
      "sections/10-a/20-one/scene.ts": bar("data/one.csv"),
      "sections/10-a/30-two/scene.ts": bar("data/two.csv"),
      "sections/10-a/40-again/scene.ts": bar("data/one.csv"),
      "sections/10-a/50-kpi/scene.ts": {
        build: (ctx: Ctx) => [
          kpi(ctx, { x: 120, y: 120, value: 1284, label: "Orders", source: "Survey C" }),
          kpi(ctx, { x: 660, y: 120, value: 14, label: "Lead time" }),
        ],
        steps: [(tl: gsap.core.Timeline, k: ReturnType<typeof kpi>[]) => k.forEach((x) => x.show(tl))],
      },
      "sections/10-a/60-roll/scene.ts": {
        build: (ctx: Ctx) => endRoll(ctx, { title: "Sources", thanks: ["Thanks to the team"] }),
        steps: [(tl: gsap.core.Timeline, e: ReturnType<typeof endRoll>) => e.show(tl)],
      },
    },
  );
  r.deck.files = {
    data: {
      "data/one.csv": "# source: Statistik A\nq,units\nQ1,120\nQ2,185\n",
      "data/two.csv": "# source: Statistik B\nq,units\nQ1,20\nQ2,85\n",
    },
    media: {},
  };
  return r;
};
