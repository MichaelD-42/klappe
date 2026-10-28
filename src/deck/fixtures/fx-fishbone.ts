import { assembleDeck } from "../assemble";
import { fishbone, type FishboneHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// Four cause bones built one per step (the second's adder made before the first's: they still build in order), the
// root cause lit, then moved; then light(3) before bone 3 exists and a next() past the last bone (the two problems).
const md = (title: string, n: number) => `## ${title}\n\n${"- Step.\n".repeat(n)}`;
type R = { f: FishboneHandle; a: any; b: any };
const bones: SceneModule = {
  build: (ctx) => {
    const f = fishbone(ctx, {
      x: 160, y: 120, w: 1600, h: 800,
      effect: "Releases slip",
      causes: [
        { label: "People", items: ["One reviewer", "New joiners"] },
        { label: "Process", items: ["Late testing", "Big batches"] },
        { label: "Tools", items: ["Slow CI"] },
        { label: "Environment", items: ["Shared staging", "Flaky data"] },
      ],
    });
    const b = f.next();
    const a = f.next();
    return { f, a, b };
  },
  steps: [
    (tl, r: R) => r.f.show(tl),
    (tl, r: R) => r.b(tl),
    (tl, r: R) => r.a(tl),
    (tl, r: R) => (r.f.light(3)(tl), r.f.next()(tl)),
    (tl, r: R) => r.f.next()(tl),
    (tl, r: R) => r.f.light(1)(tl),
    (tl, r: R) => r.f.light(3)(tl),
    (tl, r: R) => (r.f.light(null)(tl), r.f.next()(tl)),
  ],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Fishbone\n",
      "sections/10-a/10-bones/scene.md": md("Bones", 8),
    },
    { "sections/10-a/10-bones/scene.ts": bones },
  );
