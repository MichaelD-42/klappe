import { assembleDeck } from "../assemble";
import { calendar, type CalendarHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// November 2026: shown, a deadline marked, a sprint spanned over three weeks, a second mark. A second scene marks
// a day of another month and spans backwards (the fixture's two problems).
const md = (title: string, n: number) => `## ${title}\n\n${"- Step.\n".repeat(n)}`;
type R = { c: CalendarHandle };
const month: SceneModule = {
  build: (ctx) => {
    const c = calendar(ctx, { month: "2026-11", x: 260, y: 100, w: 1400, h: 760 });
    return { c, a: c.mark("2026-11-03", { label: "Kick-off" }), s: c.span("2026-11-05", "2026-11-17", { label: "Sprint 12" }), b: c.mark("2026-11-27", { label: "Release" }) };
  },
  steps: [(tl, r: R) => r.c.show(tl), (tl, r: any) => r.a(tl), (tl, r: any) => r.s(tl), (tl, r: any) => r.b(tl)],
};
const bad: SceneModule = {
  build: (ctx) => ({ c: calendar(ctx, { month: "2026-11", x: 260, y: 100, w: 1400, h: 760 }) }),
  steps: [(tl, r: R) => r.c.show(tl), (tl, r: R) => r.c.mark("2026-12-24")(tl), (tl, r: R) => r.c.span("2026-11-20", "2026-11-10")(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Calendar\n",
      "sections/10-a/10-month/scene.md": md("Month", 4),
      "sections/10-a/20-bad/scene.md": md("Bad", 3),
    },
    { "sections/10-a/10-month/scene.ts": month, "sections/10-a/20-bad/scene.ts": bad },
  );
