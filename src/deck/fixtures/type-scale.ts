import { assembleDeck } from "../assemble";
import { checklist, kpi, text, type BasicHandle, type ChecklistHandle, type StatHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// A theme that sets the type scale half again as large: the Markdown scene, text, a fitted list and a big number follow it.
const coded: SceneModule = {
  build: (ctx) => ({
    t: text(ctx, { text: "Body text", x: 160, y: 120, w: 1600 }),
    c: checklist(ctx, { items: [{ text: "Ship it", done: true }], x: 160, y: 320, w: 900 }),
    k: kpi(ctx, { x: 1200, y: 320, value: 42, label: "Teams" }),
  }),
  steps: [(tl, r: { t: BasicHandle; c: ChecklistHandle; k: StatHandle }) => (r.t.show(tl), r.c.show(tl), r.k.show(tl))],
};

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Type scale\ntheme: type-scale\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-md/scene.md": "---\nstack: true\n---\n## Title\n\n- Body.\n",
      "sections/10-a/20-coded/scene.md": "## Coded\n\n- Text, a list and a number.\n",
    },
    { "sections/10-a/20-coded/scene.ts": coded },
  );
  r.deck.themes = { "deck:type-scale": ":root { --k-size-title: 132px; --k-size-body: 66px; --k-size-label: 42px; }" };
  return r;
};
