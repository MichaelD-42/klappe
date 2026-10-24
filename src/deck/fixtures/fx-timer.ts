import { assembleDeck } from "../assemble";
import { timer, type TimerHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// One scene per style, with and without a label; the ring scene has a later step (the timer keeps running)
// and the intro scene before it has no timer (t does nothing there).
const one = (o: Parameters<typeof timer>[1], steps = 1): SceneModule => ({
  build: (ctx) => ({ t: timer(ctx, o) }),
  steps: [(tl, r: { t: TimerHandle }) => r.t.show(tl), ...Array(steps - 1).fill(null)],
});

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Timer\n",
      "sections/10-a/10-intro/scene.md": "## Intro\n\n- Before the exercise.\n",
      "sections/10-a/20-ring/scene.md": "## Ring\n\n- The timer.\n- Work on the exercise while the timer runs.\n",
      "sections/10-a/30-bar/scene.md": "## Bar\n\n- The timer.\n",
      "sections/10-a/40-donut/scene.md": "## Donut\n\n- The timer.\n",
      "sections/10-a/50-text/scene.md": "## Text\n\n- The timer.\n",
      "sections/10-a/60-until/scene.md": "## Until\n\n- Two timers to a time of day.\n",
      "sections/10-a/70-cycle/scene.md": "## Cycle\n\n- One run per speaker.\n",
      "sections/10-a/80-hide/scene.md": "## Hide\n\n- The timer.\n- Still running.\n- Done: the timer goes.\n",
    },
    {
      "sections/10-a/20-ring/scene.ts": one({ minutes: 10, style: "ring", x: 760, y: 220, size: 400, label: "Exercise 1" }, 2),
      "sections/10-a/30-bar/scene.ts": one({ minutes: 10, style: "bar", x: 360, y: 400, size: 1200, label: "Group work" }),
      "sections/10-a/40-donut/scene.ts": one({ minutes: 5, style: "donut", x: 760, y: 220, size: 400 }),
      "sections/10-a/50-text/scene.ts": one({ minutes: 1, style: "text", x: 660, y: 300, size: 600 }),
      "sections/10-a/70-cycle/scene.ts": one({ minutes: 0.05, cycle: true, style: "text", x: 660, y: 300, size: 600 }),
      // hide: shown on step 1, gone on step 3.
      "sections/10-a/80-hide/scene.ts": {
        build: (ctx) => ({ t: timer(ctx, { minutes: 10, style: "text", x: 660, y: 300, size: 600, label: "Pairs" }) }),
        steps: [(tl, r: { t: TimerHandle }) => r.t.show(tl), null, (tl, r: { t: TimerHandle }) => r.t.hide(tl)],
      } satisfies SceneModule,
      // until: a time ahead and midnight, which has passed (the e2e test sets the clock to 10:05:30).
      "sections/10-a/60-until/scene.ts": {
        build: (ctx) => ({
          a: timer(ctx, { until: "10:20", style: "text", x: 260, y: 300, size: 600 }),
          b: timer(ctx, { until: "00:00", style: "text", x: 1060, y: 300, size: 600 }),
        }),
        steps: [(tl, r: { a: TimerHandle; b: TimerHandle }) => (r.a.show(tl), r.b.show(tl))],
      } satisfies SceneModule,
    },
  );
