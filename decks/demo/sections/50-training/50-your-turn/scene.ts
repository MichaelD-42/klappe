import { gsap } from "gsap";
import { checklist, lineArt, mesh3d, timer, type ChecklistHandle, type LineArtHandle, type Mesh3dHandle, type TimerHandle } from "klappe/fx";
import desk from "klappe/fx/art/engineer-desk.svg?raw";
import type { SceneModule, StepFn } from "klappe/types";
import { centre, layer, title } from "../section";
import md from "./scene.md?raw";

// A scene.ts scene gets no Markdown rendering, so the task items are read from scene.md: written once, there.
const ITEMS = [...md.matchAll(/^- \[([ x])\] (.+)$/gm)].map(([, done, text]) => ({ text, done: done === "x" }));
// The list is drawn 1.2 times larger than checklist()'s 40 px text, so it weighs about as much as the ring.
const SCALE = 1.2;

interface Refs {
  h: HTMLElement;
  desk: Element[];
  art: LineArtHandle;
  mesh: Mesh3dHandle;
  list: ChecklistHandle;
  t: TimerHandle;
}

// The call to work, then the work: the desk leaves, and the list and the ring sit centred on one line.
const scene: SceneModule = {
  build(ctx): Refs {
    const h = title(ctx, ctx.doc!.title);
    const room = layer(ctx);
    const art = lineArt(room.ctx, { src: desk, x: 460, y: 300, w: 1000 });
    // A quiet helper beside the desk: calm while the pairs form, insight when the bulb lights.
    const mesh = mesh3d(room.ctx, { x: 1660, y: 560, size: 360 });
    const big = ctx.html.appendChild(document.createElement("div"));
    Object.assign(big.style, { position: "absolute", left: "0", top: "0", transform: `scale(${SCALE})`, transformOrigin: "0 0" });
    const list = checklist({ ...ctx, html: big }, { items: ITEMS, x: 160 / SCALE, y: 0, w: 780 });
    centre(list.el, SCALE);
    const t = timer(ctx, { minutes: 10, style: "ring", x: 1280, y: 0, size: 460, label: "In pairs" });
    centre(t.el);
    gsap.set(room.els, { autoAlpha: 1 }); // written at load, as a seek back to the start leaves it
    return { h, desk: room.els, art, mesh, list, t };
  },
  steps: [
    (tl, r: Refs) => {
      tl.to(r.h, { autoAlpha: 1, duration: 0.6 });
      r.art.draw(tl);
      r.mesh.show(tl, "<");
    },
    (tl, r: Refs) => {
      r.art.glow(tl, ".bulb");
      r.mesh.mood(tl, "insight", "<");
    },
    (tl, r: Refs) => {
      tl.to(r.desk, { autoAlpha: 0, duration: 0.5 });
      r.list.show(tl);
      r.t.show(tl);
    },
    ...ITEMS.map((_, i): StepFn => (tl, r: Refs) => r.list.tick(i)(tl)),
  ],
};
export default scene;
