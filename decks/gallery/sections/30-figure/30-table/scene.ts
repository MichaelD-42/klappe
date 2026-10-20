import { figure } from "klappe/fx";
import type { Ctx } from "klappe/types";
import { captioned } from "../../../caption";

const SVG = "http://www.w3.org/2000/svg";

function line(ctx: Ctx, d: string, style: Partial<CSSStyleDeclaration> = {}) {
  const p = document.createElementNS(SVG, "path");
  p.setAttribute("d", d);
  Object.assign(p.style, { fill: "none", stroke: "var(--k-fg)", strokeWidth: "4", strokeLinecap: "round", ...style });
  ctx.svg.append(p);
}

// The table is drawn after the figures and filled, so it hides the one behind it.
export default captioned("f.gather(tl, x, y) — figures walk to their places at a table", {
  build(ctx) {
    const fs = [
      figure(ctx, { x: 1500, y: 860, scale: 1.25, color: "var(--k-accent)" }),
      figure(ctx, { x: 260, y: 860, scale: 1.25, color: "var(--k-fg)" }),
      figure(ctx, { x: 1760, y: 860, scale: 1.25, color: "var(--k-fg)" }),
    ];
    line(ctx, "M712 860 L712 706 L1208 706 L1208 860", { fill: "var(--k-bg)" }); // table front, open at the floor
    line(ctx, "M160 860 L1760 860"); // floor, over the table front
    line(ctx, "M680 690 L1240 690 L1240 706 L680 706 Z", { fill: "var(--k-bg)" }); // table top
    line(ctx, "M752 682 L752 630 L840 630 L840 682 M736 690 L856 690"); // laptop
    line(ctx, "M1140 688 L1140 654 L1168 654 L1168 688 M1168 662 Q1182 662 1182 671 Q1182 680 1168 680"); // mug
    return { fs };
  },
  steps: [
    (tl, { fs }) => fs.forEach((f: ReturnType<typeof figure>) => f.appear(tl)),
    (tl, { fs }) => {
      fs[0].gather(tl, 960, 855, undefined, 2); // behind the table: feet clear of the floor line
      fs[1].gather(tl, 600, 860, "<", 2);
      fs[2].gather(tl, 1320, 860, "<", 2);
    },
  ],
});
