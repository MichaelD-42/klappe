import { gsap } from "gsap";
import { morph } from "klappe/fx";
import { captioned } from "../../../caption";
import { heading } from "../section";

const SVG = "http://www.w3.org/2000/svg";

// An SVG square becomes a circle in another place.
export default captioned("morph() on SVG shapes — a square becomes a circle somewhere else", {
  build(ctx) {
    const h = heading(ctx, "Shape to shape");
    const make = (tag: string, attrs: Record<string, number | string>) => {
      const e = document.createElementNS(SVG, tag);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
      ctx.svg.append(e);
      return e;
    };
    const sq = make("rect", { x: 0, y: 0, width: 160, height: 160, fill: "var(--k-fg)", transform: "translate(300 450)" });
    const dot = make("circle", { cx: 1400, cy: 600, r: 160, fill: "var(--k-accent)" });
    gsap.set(sq, { autoAlpha: 0 });
    return { h, sq, m: morph(ctx, { from: sq, to: dot }) };
  },
  steps: [(tl, { h, sq }) => tl.to([h, sq], { autoAlpha: 1, duration: 0.6 }), (tl, { m }) => m.play(tl)],
});
