import { gsap } from "gsap";
import { swarm, type SwarmHandle } from "klappe/fx";
import type { Rect } from "klappe/types";
import { captioned } from "../../../caption";

const FULL: Rect = { x: 0, y: 0, w: 1920, h: 1080 };
const FROM: Rect = { x: 160, y: 380, w: 400, h: 520 }; // ends above the caption strip at y 960
const TO: Rect = { x: 1360, y: 440, w: 400, h: 400 };
// The pile lands inside the Analysis box, below its label: an inset that keeps the 14 px dots off the border.
const PILE: Rect = { x: TO.x + 24, y: TO.y + 90, w: TO.w - 48, h: TO.h - 114 };

// A labelled outline for an area, hidden until step 1.
function area(r: Rect, label: string): HTMLElement {
  const b = document.createElement("div");
  b.textContent = label;
  Object.assign(b.style, {
    position: "absolute", left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`,
    boxSizing: "border-box", border: "3px solid var(--k-accent)", padding: "12px 16px", fontSize: "32px",
  });
  return b;
}

// The default 2000 seeded points stream from the inbox into analysis.
export default captioned("swarm() — seeded dots stream from one area to another: stream", {
  build(ctx) {
    const s = swarm(ctx, { rect: FULL, from: FROM, to: PILE, seed: 1 }); // first, so the labels sit above the canvas
    const boxes = [area(FROM, "Inbox"), area(TO, "Analysis")];
    ctx.html.append(...boxes);
    gsap.set(boxes, { autoAlpha: 0 });
    return { s, boxes };
  },
  steps: [
    (tl, { s, boxes }: { s: SwarmHandle; boxes: HTMLElement[] }) => {
      tl.to(boxes, { autoAlpha: 1, duration: 0.6 });
      s.stream(tl, { duration: 2.5 });
    },
  ],
}, "cut");
