import * as d3 from "d3";
import { gsap } from "gsap";
import { parseCsv, typeSize } from "klappe/fx";
import { captioned } from "../../../caption";

// A dumbbell, lead time before and after per team: a chart chart() lacks, drawn with d3 in scene.ts.
// The recipe: build every mark in build(), hidden or at its start; the steps only tween them; colours are tokens.
const PLOT = { x: 440, y: 150, w: 1240, h: 640 }; // scene px; the team names sit left of it, the axis under it
const FILE = "data/chart-dumbbell.csv";

export default captioned("your own chart — d3 scales into ctx.svg, rows from data/, colours from --k-* tokens", {
  build: (ctx) => {
    const rows = parseCsv(ctx.files.data[FILE] ?? "").map((r) => ({ team: String(r.team), before: Number(r.before), after: Number(r.after) }));
    if (!rows.length) ctx.problem(`dumbbell: no rows in ${FILE}`);
    const x = d3.scaleLinear().domain([0, d3.max(rows, (r) => Math.max(r.before, r.after)) ?? 1]).nice().range([PLOT.x, PLOT.x + PLOT.w]);
    const y = d3.scalePoint().domain(rows.map((r) => r.team)).range([PLOT.y, PLOT.y + PLOT.h]).padding(0.5);
    const font = typeSize("label", 28); // follows the theme's type scale
    const g = d3.select(ctx.svg).append("g").style("font-family", "var(--k-font)");

    const axis = g.append("g").attr("transform", `translate(0 ${PLOT.y + PLOT.h})`).style("color", "var(--k-muted)")
      .call(d3.axisBottom(x).ticks(5).tickSizeOuter(0));
    axis.attr("font-family", null).attr("font-size", font).selectAll("line, path").attr("stroke-width", 2);
    const head = g.append("text").attr("x", PLOT.x - 280).attr("y", PLOT.y - 60).attr("font-size", typeSize("body", 40))
      .attr("font-weight", 700).style("fill", "var(--k-fg)").text("Lead time in days, before (grey) and now");
    const names = g.selectAll("text.name").data(rows).join("text").attr("x", PLOT.x - 32).attr("y", (r) => y(r.team)!)
      .attr("dy", "0.35em").attr("text-anchor", "end").attr("font-size", font).style("fill", "var(--k-fg)").text((r) => r.team);
    // Faster is better: a team that got faster ends in --k-ok, slower in --k-warn.
    const tone = (r: (typeof rows)[number]) => (r.after <= r.before ? "var(--k-ok)" : "var(--k-warn)");
    const bars = g.selectAll("line.bar").data(rows).join("line").attr("y1", (r) => y(r.team)!).attr("y2", (r) => y(r.team)!)
      .attr("x1", (r) => x(r.before)).attr("x2", (r) => x(r.before)) // zero length: the step grows it to after
      .attr("stroke-width", 8).style("stroke", tone);
    const before = g.selectAll("circle.before").data(rows).join("circle").attr("cx", (r) => x(r.before)).attr("cy", (r) => y(r.team)!)
      .attr("r", 14).style("fill", "var(--k-muted)");
    const after = g.selectAll("circle.after").data(rows).join("circle").attr("cx", (r) => x(r.after)).attr("cy", (r) => y(r.team)!)
      .attr("r", 14).style("fill", tone);

    const start = [head.node()!, axis.node()!, ...names.nodes(), ...before.nodes()];
    gsap.set([...start, ...after.nodes()], { autoAlpha: 0 });
    return { start, after: after.nodes(), bars: bars.nodes().map((el, i) => ({ el, to: x(rows[i].after) })) };
  },
  steps: [
    (tl, r) => void tl.to(r.start, { autoAlpha: 1, duration: 0.6, stagger: 0.04 }),
    (tl, r) => {
      r.bars.forEach((b: { el: SVGLineElement; to: number }, i: number) => tl.to(b.el, { attr: { x2: b.to }, duration: 0.9, ease: "power2.inOut" }, i ? "<" : undefined));
      tl.to(r.after, { autoAlpha: 1, duration: 0.3 }, ">-0.2");
    },
  ],
});
