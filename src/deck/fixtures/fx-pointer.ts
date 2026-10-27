import { assembleDeck } from "../assemble";
import { pointer, type PointerHandle } from "klappe/fx";
import { gsap } from "gsap";
import type { SceneModule } from "../../types";

// A field and a button: the pointer shows, moves to the field, clicks and types, moves to a point and clicks,
// then hides. A second scene types into an element with no size (the fixture's only problem).
type R = { p: PointerHandle; field: HTMLElement; button: HTMLElement };
const box = (ctx: Parameters<NonNullable<SceneModule["build"]>>[0], left: number, top: number, w: number, h: number) => {
  const e = ctx.html.appendChild(document.createElement("div"));
  Object.assign(e.style, { position: "absolute", left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px`, border: "3px solid var(--k-line)", boxSizing: "border-box" });
  return e;
};
const walk: SceneModule = {
  build(ctx): R {
    const [field, button] = [box(ctx, 400, 300, 600, 64), box(ctx, 400, 500, 300, 64)];
    gsap.set([field, button], { autoAlpha: 1 });
    return { p: pointer(ctx, { at: { x: 1400, y: 800 } }), field, button };
  },
  steps: [
    (tl, r: R) => r.p.show(tl),
    (tl, r: R) => (r.p.move(r.field)(tl), r.p.click(tl), r.p.type(r.field, "ada@example.com")(tl)),
    (tl, r: R) => (r.p.move({ x: 550, y: 532 })(tl), r.p.click(tl)),
    (tl, r: R) => r.p.hide(tl),
  ],
};
const noSize: SceneModule = {
  build(ctx) {
    const hidden = ctx.html.appendChild(document.createElement("div"));
    hidden.style.display = "none";
    return { p: pointer(ctx, { at: { x: 100, y: 100 } }), hidden };
  },
  steps: [(tl, r: { p: PointerHandle; hidden: HTMLElement }) => r.p.type(r.hidden, "x")(tl)],
};

// drag: a card dragged onto a zone, then on to a point; the pointer ends on the card's centre each time.
type D = { p: PointerHandle; card: HTMLElement; zone: HTMLElement };
const drag: SceneModule = {
  build(ctx): D {
    const [card, zone] = [box(ctx, 300, 300, 240, 140), box(ctx, 1200, 500, 400, 300)];
    gsap.set([card, zone], { autoAlpha: 1 });
    return { p: pointer(ctx, { at: { x: 900, y: 900 } }), card, zone };
  },
  steps: [
    (tl, r: D) => r.p.show(tl),
    (tl, r: D) => r.p.drag(r.card, r.zone)(tl),
    (tl, r: D) => r.p.drag(r.card, { x: 700, y: 300 })(tl),
  ],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Pointer\n",
      "sections/10-a/10-walk/scene.md": "## Walk\n\n- Show.\n- Click and type.\n- Click the button.\n- Hide.\n",
      "sections/10-a/20-no-size/scene.md": "## No size\n\n- Type into nothing.\n",
      "sections/10-a/30-drag/scene.md": "## Drag\n\n- Show.\n- Drag the card onto the zone.\n- Drag it on.\n",
    },
    { "sections/10-a/10-walk/scene.ts": walk, "sections/10-a/20-no-size/scene.ts": noSize, "sections/10-a/30-drag/scene.ts": drag },
  );
