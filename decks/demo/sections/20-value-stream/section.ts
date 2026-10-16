import type { Rect, SectionModule } from "../../../../src/types";

const SVG = "http://www.w3.org/2000/svg";
const NAMES = ["Requirements", "Analysis", "Clarification", "Design", "Verification"];
// Stage centres keep Requirements in the overview scene (0..1920) and Verification left of
// the global-team scene (from 5760). The band sits low, under the default scene text.
const X0 = 600;
const GAP = 1200;
const Y = 990;
const BOX = { width: 360, height: 100 };

const centre = (name: string) => X0 + GAP * NAMES.findIndex((n) => n.toLowerCase() === name);

// A full stage-sized frame centred on a stage box, so default scene text still fits around it.
export const stageFrame = (name: string): Rect => ({ x: centre(name) - 960, y: 0, w: 1920, h: 1080 });

const svgEl = (tag: string, attrs: Record<string, string | number>) => {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

const section: SectionModule = {
  build(ctx) {
    const x1 = X0;
    const x2 = X0 + GAP * (NAMES.length - 1);
    const line = svgEl("line", { x1, y1: Y, x2, y2: Y, "stroke-width": 6, "stroke-dasharray": x2 - x1 });
    line.style.stroke = "var(--k-accent)";
    line.style.strokeDashoffset = String(x2 - x1); // hidden until the overview draws it on
    ctx.svg.append(line);

    const boxes = NAMES.map((name, i) => {
      const g = svgEl("g", { "data-stage": name.toLowerCase() });
      Object.assign(g.style, { opacity: "0", visibility: "hidden" }); // the overview fades the stages in
      const r = svgEl("rect", { x: X0 + GAP * i - BOX.width / 2, y: Y - BOX.height / 2, ...BOX, rx: 6, "stroke-width": 4 });
      r.style.fill = "var(--k-bg)";
      r.style.stroke = "var(--k-accent)";
      const t = svgEl("text", { x: X0 + GAP * i, y: Y, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 44 });
      t.style.fill = "var(--k-fg)";
      t.textContent = name;
      g.append(r, t);
      ctx.svg.append(g);
      return g;
    });

    return {
      stages: Object.fromEntries(NAMES.map((n) => [n.toLowerCase(), stageFrame(n.toLowerCase())])),
      stream: { line, boxes },
    };
  },
};
export default section;
