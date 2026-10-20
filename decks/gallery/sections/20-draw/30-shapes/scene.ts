import { drawOn } from "klappe/fx";
import { captioned } from "../../10-chart/section";

const SVG = "http://www.w3.org/2000/svg";

// Two groups of the same shapes: drawOn with default timing, then with custom timing on non-scaling strokes.
export default captioned("drawOn(elements, { duration, each }) — any stroked SVG shape draws on", {
  build(ctx) {
    const group = (transform: string, nonScaling: boolean) => {
      const g = document.createElementNS(SVG, "g");
      g.setAttribute("transform", transform);
      g.innerHTML = '<path d="M0 0 H100 V60 H0 Z"/><circle cx="50" cy="30" r="20"/><path d="M0 80 Q50 120 100 80"/>';
      for (const s of g.children) {
        if (nonScaling) s.setAttribute("vector-effect", "non-scaling-stroke");
        Object.assign((s as SVGElement).style, { fill: "none", stroke: "var(--k-fg)", strokeWidth: "6", strokeLinecap: "round" });
      }
      ctx.svg.append(g);
      return g;
    };
    return { plain: group("translate(260 260) scale(5)", false), thin: group("translate(1160 260) scale(5)", true) };
  },
  steps: [(tl, r) => drawOn(r.plain)(tl), (tl, r) => drawOn(r.thin.children, { duration: 0.5, each: 0.3 })(tl)],
});
