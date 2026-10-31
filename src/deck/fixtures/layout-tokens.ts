import { assembleDeck } from "../assemble";
import { checklist, kpi, pyramid } from "klappe/fx";
import type { SceneModule } from "../../types";

// A theme that sets the layout tokens to 2x the radius, 2x the stroke and 4x the gap of the defaults: a KPI box, a
// pyramid's outlines and the gap between its layers, and a checklist's row gap follow.
const coded: SceneModule = {
  build: (ctx) => ({
    k: kpi(ctx, { x: 1200, y: 120, value: 42, label: "Teams" }),
    p: pyramid(ctx, { x: 160, y: 120, w: 800, h: 400, layers: [{ id: "a", label: "Base" }, { id: "b", label: "Top" }] }),
    c: checklist(ctx, { items: [{ text: "One", done: true }, { text: "Two", done: false }], x: 160, y: 600, w: 900 }),
  }),
  steps: [(tl, r: any) => (r.k.show(tl), r.p.next()(tl), r.p.next()(tl), r.c.show(tl))],
};

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Layout tokens\ntheme: layout-tokens\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-coded/scene.md": "## Coded\n\n- A box, a pyramid and a list.\n",
    },
    { "sections/10-a/10-coded/scene.ts": coded },
  );
  r.deck.themes = { "deck:layout-tokens": ":root { --k-radius: 24px; --k-stroke: 8px; --k-gap: 32px; }" };
  return r;
};
