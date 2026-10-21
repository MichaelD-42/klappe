import { checklist, timer, type ChecklistHandle, type TimerHandle } from "klappe/fx";
import type { SceneModule, StepFn } from "klappe/types";
import { title } from "../section";
import md from "./scene.md?raw";

// A scene.ts scene gets no Markdown rendering, so the task items are read from scene.md: written once, there.
const ITEMS = [...md.matchAll(/^- \[([ x])\] (.+)$/gm)].map(([, done, text]) => ({ text, done: done === "x" }));

interface Refs {
  h: HTMLElement;
  list: ChecklistHandle;
  t: TimerHandle;
}

// The list on the left, the ring on the right, with a clear gap between them.
const scene: SceneModule = {
  build: (ctx): Refs => ({
    h: title(ctx, "Exercise: review a change"),
    list: checklist(ctx, { items: ITEMS, x: 160, y: 320, w: 880, h: 560 }),
    t: timer(ctx, { minutes: 10, style: "ring", x: 1260, y: 300, size: 460, label: "In pairs" }),
  }),
  steps: [
    (tl, r: Refs) => {
      tl.to(r.h, { autoAlpha: 1, duration: 0.6 });
      r.list.show(tl);
      r.t.show(tl);
    },
    ...ITEMS.map((_, i): StepFn => (tl, r: Refs) => r.list.tick(i)(tl)),
  ],
};
export default scene;
