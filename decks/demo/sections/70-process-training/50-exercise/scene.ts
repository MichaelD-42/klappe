import { checklist, timer, type ChecklistHandle, type TimerHandle } from "klappe/fx";
import type { SceneModule, StepFn } from "klappe/types";
import { centre } from "../../60-technical-training/section";
import { title } from "../section";
import md from "./scene.md?raw";

// A scene.ts scene gets no Markdown rendering, so the task items are read from scene.md: written once, there.
const ITEMS = [...md.matchAll(/^- \[([ x])\] (.+)$/gm)].map(([, done, text]) => ({ text, done: done === "x" }));
// The list is drawn 1.2 times larger than checklist()'s 40 px text, so it weighs about as much as the ring.
const SCALE = 1.2;

interface Refs {
  h: HTMLElement;
  list: ChecklistHandle;
  t: TimerHandle;
}

// The list on the left, the ring on the right, both centred on one horizontal line.
const scene: SceneModule = {
  build(ctx): Refs {
    const h = title(ctx, "Exercise: review a change");
    const big = ctx.html.appendChild(document.createElement("div"));
    Object.assign(big.style, { position: "absolute", left: "0", top: "0", transform: `scale(${SCALE})`, transformOrigin: "0 0" });
    const list = checklist({ ...ctx, html: big }, { items: ITEMS, x: 160 / SCALE, y: 0, w: 780 });
    centre(big.lastElementChild as HTMLElement, SCALE);
    const t = timer(ctx, { minutes: 10, style: "ring", x: 1280, y: 0, size: 460, label: "In pairs" });
    centre(ctx.html.lastElementChild as HTMLElement); // timer() appends its block last
    return { h, list, t };
  },
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
