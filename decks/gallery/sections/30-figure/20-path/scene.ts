import { figure } from "klappe/fx";
import { captioned } from "../../10-chart/section";

const SVG = "http://www.w3.org/2000/svg";

export default captioned("figure({ scale, color }) — f.walk(tl, pathElement) follows a path you drew", {
  build(ctx) {
    const route = document.createElementNS(SVG, "path");
    route.setAttribute("d", "M300 800 Q 960 420 1620 800");
    Object.assign(route.style, { fill: "none", stroke: "var(--k-fg)", strokeWidth: "4", strokeLinecap: "round", strokeDasharray: "4 14", opacity: "0.5" });
    ctx.svg.append(route);
    return { route, f: figure(ctx, { x: 300, y: 800, scale: 0.7, color: "var(--k-accent)" }) };
  },
  steps: [(tl, { f }) => f.appear(tl), (tl, { f, route }) => f.walk(tl, route, { duration: 2.5, at: "+=0.2" })],
});
