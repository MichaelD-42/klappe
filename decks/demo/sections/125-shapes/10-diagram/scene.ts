import { arrow, shape, tint, token, type ShapeHandle } from "klappe/fx";
import type { StepAdder } from "klappe/types";
import { gsap } from "gsap";
import type { Ctx } from "klappe/types";
import { captioned } from "../../../caption";

interface Refs {
  boxes: ShapeHandle[];
  link: ShapeHandle;
  ring: ShapeHandle;
  labels: HTMLElement[];
  accent: StepAdder;
}

// A label centred in a box, hidden until the boxes draw.
function label(ctx: Ctx, text: string, x: number): HTMLElement {
  const l = ctx.html.appendChild(document.createElement("div"));
  l.textContent = text;
  Object.assign(l.style, {
    position: "absolute", left: `${x}px`, top: "380px", width: "440px", textAlign: "center",
    font: "700 56px/160px var(--k-font)", color: "var(--k-fg)",
  });
  gsap.set(l, { autoAlpha: 0 });
  return l;
}

export default captioned("shape(ctx, { kind }), arrow(ctx, { from, to, curve }) with draw() or show(); tint(el, { to }) and token(el, name) for colour tweens", {
  build(ctx): Refs {
    const labels = [label(ctx, "Plan", 260), label(ctx, "Ship", 1220)];
    const ring = shape(ctx, { kind: "circle", x: 1440, y: 460, r: 280 });
    // In --k-fg, where its tint starts: --k-accent or --k-line to --k-warn passes through grey in the calm theme.
    ring.el.style.stroke = "var(--k-fg)";
    return {
      boxes: [260, 1220].map((x) => shape(ctx, { kind: "rect", x, y: 340, w: 440, h: 240 })),
      link: arrow(ctx, { from: { x: 730, y: 460 }, to: { x: 1140, y: 460 }, curve: 0.15, accent: true }),
      ring,
      labels,
      accent: tint(labels[1], { to: "--k-accent" }, ctx), // ctx reports an unknown token
    };
  },
  steps: [
    (tl, r: Refs) => {
      r.boxes.forEach((b) => b.draw(tl));
      tl.to(r.labels, { autoAlpha: 1, duration: 0.6 }, "<");
    },
    (tl, r: Refs) => r.link.draw(tl),
    (tl, r: Refs) => r.ring.show(tl),
    (tl, r: Refs) => r.accent(tl),
    // token() for a tween of your own: GSAP cannot tween var(--k-…), so read both ends as colours.
    (tl, r: Refs) =>
      void tl.fromTo(r.ring.el, { stroke: token(r.ring.el, "--k-fg") }, { stroke: token(r.ring.el, "--k-warn"), duration: 0.6, immediateRender: false }),
  ],
});
