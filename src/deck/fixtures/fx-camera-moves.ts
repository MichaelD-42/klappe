import { assembleDeck } from "../assemble";
import { dollyZoom, rackFocus, tilt } from "klappe/fx";
import type { Ctx, SceneModule, StepAdder } from "../../types";

// Three boxes in a row, 300 px wide, with data-box="0..2".
const boxes = (ctx: Ctx) =>
  [0, 1, 2].map((i) => {
    const b = ctx.html.appendChild(document.createElement("div"));
    b.setAttribute("data-box", String(i));
    Object.assign(b.style, { position: "absolute", left: `${260 + i * 500}px`, top: "400px", width: "300px", height: "200px", background: "var(--k-accent)", opacity: "1" });
    return b;
  });
const hold: StepAdder = (tl) => void tl.set({}, {}, tl.duration() + 0.1); // a step of its own for the rest state

// The focus moves from box 0 to box 2, then clears. The adders are made in build, out of step order.
const rack: SceneModule = {
  build(ctx) {
    const items = boxes(ctx);
    const f = rackFocus(ctx, items);
    const late = f.on(items[2]);
    return { first: f.on(0), late, clear: f.clear };
  },
  steps: [hold, (tl, r: Record<string, StepAdder>) => r.first(tl), (tl, r) => r.late(tl), (tl, r) => r.clear(tl)],
};

// The scene sits below the row; the camera leans as it flies two frames right, then back.
const lean: SceneModule = {
  place: () => ({ x: 0, y: 1400, w: 1920, h: 1080 }),
  build(ctx) {
    boxes(ctx);
    const far = { ...ctx.rect, x: ctx.rect.x + 3840 };
    return { back: tilt(ctx, ctx.rect, { deg: 6 }), there: tilt(ctx, far, { deg: 6 }) };
  },
  steps: [hold, (tl, r: Record<string, StepAdder>) => r.there(tl), (tl, r) => r.back(tl)],
};

// Box 1 holds its size while the camera pulls back and the background grows; then it all goes back.
const vertigo: SceneModule = {
  background: { animate: "aurora" },
  build(ctx) {
    const [, target] = boxes(ctx);
    return { back: dollyZoom(ctx, { target, amount: 1 }), out: dollyZoom(ctx, { target, amount: 2 }) };
  },
  steps: [hold, (tl, r: Record<string, StepAdder>) => r.out(tl), (tl, r) => r.back(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Camera moves\n",
      "sections/10-a/10-rack/scene.md": "## Rack\n\n- Sharp.\n- Box 0.\n- Box 2.\n- Clear.\n",
      "sections/10-a/20-dolly/scene.md": "## Dolly\n\n- Rest.\n- Out.\n- Back.\n",
      "sections/10-a/30-lean/scene.md": "## Lean\n\n- Rest.\n- There.\n- Back.\n",
    },
    { "sections/10-a/10-rack/scene.ts": rack, "sections/10-a/20-dolly/scene.ts": vertigo, "sections/10-a/30-lean/scene.ts": lean },
  );
