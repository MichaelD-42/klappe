import { assembleDeck } from "../assemble";
import { chart, parseCsv, type ChartHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// A scatter, then a bubble chart over three years moved by index and by name, and two problems: period() on a
// scatter with no period column, and a period that is not there.
const plain = parseCsv("team,lead time,deploys\nWeb,3,12\nMobile,5,6\nData,2,9\nPlatform,8,3\n");
const timed = parseCsv(
  "team,year,lead time,deploys,people\nWeb,2023,6,4,6\nMobile,2023,8,2,4\nData,2023,7,3,3\nWeb,2024,4,8,7\nMobile,2024,6,4,5\nData,2024,5,5,4\nWeb,2025,3,12,8\nMobile,2025,5,6,5\nData,2025,2,9,6\n",
);
const rect = { x: 160, y: 80, w: 1600, h: 840 };
type R = { c: ChartHandle };
const scatter: SceneModule = {
  build: (ctx) => ({ c: chart(ctx, { src: "data/scatter.csv", data: plain, type: "scatter", rect, sample: true }) }),
  steps: [(tl, r: R) => (r.c.axes(tl), r.c.grow(tl), r.c.values(tl)), (tl, r: R) => r.c.period(1)(tl)],
};
const bubble: SceneModule = {
  build: (ctx) => ({ c: chart(ctx, { src: "data/bubble.csv", data: timed, type: "bubble", rect, sample: true }) }),
  steps: [
    (tl, r: R) => (r.c.axes(tl), r.c.grow(tl), r.c.values(tl)),
    (tl, r: R) => r.c.period(1)(tl),
    (tl, r: R) => r.c.period("2025")(tl),
    (tl, r: R) => r.c.period("2030")(tl),
  ],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Scatter\n",
      "sections/10-a/10-scatter/scene.md": "## Scatter\n\n- The points.\n- No period to go to.\n",
      "sections/10-a/20-bubble/scene.md": "## Bubble\n\n- 2023.\n- 2024.\n- 2025.\n- No 2030.\n",
    },
    { "sections/10-a/10-scatter/scene.ts": scatter, "sections/10-a/20-bubble/scene.ts": bubble },
  );
