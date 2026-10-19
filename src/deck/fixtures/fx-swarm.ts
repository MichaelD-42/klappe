import { gsap } from "gsap";
import { swarm } from "klappe/fx";
import type { Ctx, Rect, SceneModule } from "../../types";
import { assembleDeck } from "../assemble";

const FULL: Rect = { x: 0, y: 0, w: 1920, h: 1080 };

// A heading and a labelled outline for the source and target areas, all hidden until step 1.
function frame(ctx: Ctx, title: string, boxes: [Rect, string][]): HTMLElement[] {
  const h = document.createElement("h2");
  h.textContent = title;
  const out: HTMLElement[] = [h];
  for (const [r, label] of boxes) {
    const b = document.createElement("div");
    b.textContent = label;
    Object.assign(b.style, {
      position: "absolute",
      left: `${r.x}px`,
      top: `${r.y}px`,
      width: `${r.w}px`,
      height: `${r.h}px`,
      boxSizing: "border-box",
      border: "3px solid var(--k-accent)",
      padding: "12px 16px",
      fontSize: "32px",
    });
    out.push(b);
  }
  ctx.html.append(...out);
  gsap.set(out, { autoAlpha: 0 });
  return out;
}

// Thousands of documents stream from the inbox into Analysis: the default 2000 points.
const big = (from: Rect, to: Rect): SceneModule => ({
  build(ctx) {
    const s = swarm(ctx, { rect: FULL, from, to, seed: 1 }); // first, so the labels sit above the canvas
    return { s, shown: frame(ctx, "Documents stream in", [[from, "Inbox"], [to, "Analysis"]]) };
  },
  steps: [
    (tl, { shown, s }) => {
      tl.to(shown, { autoAlpha: 1, duration: 0.6 });
      s.stream(tl, { duration: 2.5 });
    },
  ],
});

// A small swarm with its own count and seed on a smaller canvas rect, top to bottom.
const small = (from: Rect, to: Rect): SceneModule => ({
  build(ctx) {
    const rect = { x: 200, y: 260, w: 1520, h: 760 };
    const s = swarm(ctx, { rect, count: 150, from, to, seed: 42 });
    return { s, shown: frame(ctx, "A small swarm", [[from, "Top"], [to, "Bottom"]]) };
  },
  steps: [
    (tl, { shown }) => tl.to(shown, { autoAlpha: 1, duration: 0.6 }),
    (tl, { s }) => s.stream(tl, { duration: 1.5 }),
  ],
});

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-stream/scene.md": "## Stream\n\n- Documents stream in.\n",
      "sections/10-a/20-small/scene.md": "## Small\n\n- Show the areas.\n- A small swarm moves down.\n",
    },
    {
      "sections/10-a/10-stream/scene.ts": big({ x: 160, y: 300, w: 400, h: 600 }, { x: 1360, y: 400, w: 400, h: 400 }),
      "sections/10-a/20-small/scene.ts": small({ x: 300, y: 300, w: 1320, h: 160 }, { x: 760, y: 820, w: 400, h: 160 }),
    },
  );
