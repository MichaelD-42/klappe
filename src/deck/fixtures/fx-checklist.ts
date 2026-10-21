import { assembleDeck } from "../assemble";
import { checklist, type ChecklistHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// show with a done item, tick in order and out of order, tick of a missing item, and a list too tall for its rect.
const rect = { x: 160, y: 200, w: 1500, h: 600 };
const items = [{ text: "Backup verified", done: true }, { text: "Restore tested" }, { text: "Owners told, in a message long enough to wrap onto a second line of this list" }];
const md = (title: string, n: number) => `## ${title}\n\n${Array.from({ length: n }, (_, i) => `- Step ${i + 1}.\n`).join("")}`;

const ticks: SceneModule = {
  build: (ctx) => ({ c: checklist(ctx, { items, ...rect }) }),
  steps: [(tl, r: { c: ChecklistHandle }) => r.c.show(tl), (tl, r) => r.c.tick(1)(tl), (tl, r) => r.c.tick(2)(tl)],
};
const missing: SceneModule = {
  build: (ctx) => ({ c: checklist(ctx, { items, ...rect }) }),
  steps: [(tl, r: { c: ChecklistHandle }) => r.c.show(tl), (tl, r) => r.c.tick(7)(tl)],
};
const tall: SceneModule = {
  build: (ctx) => ({ c: checklist(ctx, { items: Array.from({ length: 30 }, (_, i) => ({ text: `Item ${i + 1}` })), ...rect }) }),
  steps: [(tl, r: { c: ChecklistHandle }) => r.c.show(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Checklist\n",
      "sections/10-a/10-ticks/scene.md": md("Ticks", 3),
      "sections/10-a/20-missing/scene.md": md("Missing item", 2),
      "sections/10-a/30-tall/scene.md": md("Too tall", 1),
      "sections/10-a/40-markdown/scene.md": "## From Markdown\n\n- [x] Backup verified\n- [ ] Restore tested\n- [ ] Owners told\n",
    },
    { "sections/10-a/10-ticks/scene.ts": ticks, "sections/10-a/20-missing/scene.ts": missing, "sections/10-a/30-tall/scene.ts": tall },
  );
