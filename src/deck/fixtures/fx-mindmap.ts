import { assembleDeck } from "../assemble";
import { mindMap, type MindMapHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// A centre topic with four branches grown one per step, the third branch's adder made before the second's (they
// still grow in order), and a fifth next() past the last branch (the fixture's only problem).
const md = (title: string, n: number) => `## ${title}\n\n${"- Step.\n".repeat(n)}`;
type R = { m: MindMapHandle; a: any; b: any };
const grow: SceneModule = {
  build: (ctx) => {
    const m = mindMap(ctx, {
      x: 160, y: 120, w: 1600, h: 800,
      root: {
        label: "Onboarding",
        children: [
          { label: "People", children: [{ label: "Buddy" }, { label: "Team lunch" }] },
          { label: "Tools", children: [{ label: "Laptop" }, { label: "Accounts" }, { label: "VPN" }] },
          { label: "Product", children: [{ label: "Demo" }, { label: "Roadmap" }] },
          { label: "Process", children: [{ label: "Sprints" }, { label: "Reviews" }] },
        ],
      },
    });
    const b = m.next();
    const a = m.next();
    return { m, a, b };
  },
  steps: [
    (tl, r: R) => r.m.show(tl),
    (tl, r: R) => r.b(tl),
    (tl, r: R) => r.a(tl),
    (tl, r: R) => r.m.next()(tl),
    (tl, r: R) => r.m.next()(tl),
    (tl, r: R) => r.m.next()(tl),
  ],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Mind map\n",
      "sections/10-a/10-grow/scene.md": md("Grow", 6),
    },
    { "sections/10-a/10-grow/scene.ts": grow },
  );
