import { figure } from "klappe/fx";
import { captioned } from "../../../caption";

const SVG = "http://www.w3.org/2000/svg";

// The table group is drawn at 1.35x around the floor's centre (960, 860), so the scene fills the frame.
const K = 1.35;
function line(g: SVGGElement, d: string, style: Partial<CSSStyleDeclaration> = {}) {
  const p = document.createElementNS(SVG, "path");
  p.setAttribute("d", d);
  Object.assign(p.style, { fill: "none", stroke: "var(--k-fg)", strokeWidth: String(4 / K), strokeLinecap: "round", ...style });
  g.append(p);
}

// The table is drawn after the figures and filled, so it hides the one behind it.
export default captioned("f.gather(tl, x, y) — figures walk to their places at a table; f.sit(tl) seats them", {
  build(ctx) {
    const fs = [
      figure(ctx, { x: 1500, y: 860, scale: 1.25 * K, color: "var(--k-accent)", strokeWidth: 4 / K }),
      figure(ctx, { x: 200, y: 860, scale: 1.25 * K, color: "var(--k-fg)", strokeWidth: 4 / K }),
      figure(ctx, { x: 1720, y: 860, scale: 1.25 * K, color: "var(--k-fg)", strokeWidth: 4 / K }),
    ];
    const g = document.createElementNS(SVG, "g");
    g.setAttribute("transform", `translate(960 860) scale(${K}) translate(-960 -860)`);
    ctx.svg.append(g);
    line(g, "M712 860 L712 706 L1208 706 L1208 860", { fill: "var(--k-bg)" }); // table front, open at the floor
    line(g, "M310 860 L1610 860"); // floor, over the table front: 160 to 1760 once scaled
    line(g, "M680 690 L1240 690 L1240 706 L680 706 Z", { fill: "var(--k-bg)" }); // table top
    line(g, "M752 682 L752 630 L840 630 L840 682 M736 690 L856 690"); // laptop
    line(g, "M1140 688 L1140 654 L1168 654 L1168 688 M1168 662 Q1182 662 1182 671 Q1182 680 1168 680"); // mug
    return { fs };
  },
  steps: [
    (tl, { fs }) => fs.forEach((f: ReturnType<typeof figure>) => f.appear(tl)),
    (tl, { fs }) => {
      fs[0].gather(tl, 960, 853, undefined, 2); // behind the table: feet clear of the floor line
      fs[1].gather(tl, 510, 860, "<", 2); // at the table's ends (582 and 1338 once scaled)
      fs[2].gather(tl, 1410, 860, "<", 2);
    },
    (tl, { fs }) => fs.forEach((f: ReturnType<typeof figure>, i: number) => f.sit(tl, i ? "<" : undefined)),
  ],
});
