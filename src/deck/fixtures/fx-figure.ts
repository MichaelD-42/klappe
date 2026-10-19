import { assembleDeck } from "../assemble";
import { figure } from "../../fx/figure";
import type { Ctx, SceneModule } from "../../types";

const SVG = "http://www.w3.org/2000/svg";

function title(ctx: Ctx, text: string) {
  const h = document.createElement("h2");
  h.textContent = text;
  ctx.html.append(h);
}

function line(ctx: Ctx, d: string, style: Partial<CSSStyleDeclaration> = {}): SVGPathElement {
  const p = document.createElementNS(SVG, "path");
  p.setAttribute("d", d);
  Object.assign(p.style, { fill: "none", stroke: "var(--k-fg)", strokeWidth: "4", strokeLinecap: "round", ...style });
  ctx.svg.append(p);
  return p;
}

// Walk along a curve given as a path string, default scale.
const walkString: SceneModule = {
  build(ctx) {
    title(ctx, "Walk along a curve");
    return { f: figure(ctx, { x: 260, y: 960, color: "var(--k-fg)" }) };
  },
  steps: [
    (tl, { f }) => f.appear(tl),
    (tl, { f }) => f.walk(tl, "M260 960 C 700 700, 1200 1060, 1660 820", { duration: 3 }),
  ],
};

// Walk along a visible path element, smaller and in the accent colour.
const walkElement: SceneModule = {
  build(ctx) {
    title(ctx, "Walk along a path");
    const route = line(ctx, "M300 900 Q 960 520 1620 900", { strokeDasharray: "4 14", opacity: "0.5" });
    return { f: figure(ctx, { x: 300, y: 900, scale: 0.7, color: "var(--k-accent)" }), route };
  },
  steps: [
    (tl, { f }) => f.appear(tl),
    (tl, { f, route }) => f.walk(tl, route, { duration: 2.5 }),
  ],
};

// Three figures gather at a table. The table is drawn after the figures and filled, so it hides the one behind it.
const gather: SceneModule = {
  build(ctx) {
    title(ctx, "Gather at a table");
    line(ctx, "M160 960 L1760 960");
    const fs = [
      figure(ctx, { x: 1500, y: 960, color: "var(--k-accent)" }),
      figure(ctx, { x: 240, y: 960, scale: 0.9, color: "var(--k-fg)" }),
      figure(ctx, { x: 1720, y: 960, scale: 0.9, color: "var(--k-fg)" }),
    ];
    line(ctx, "M780 852 L780 960 L1140 960 L1140 852 Z", { fill: "var(--k-bg)" });
    line(ctx, "M740 840 L1180 840 L1180 856 L740 856 Z", { fill: "var(--k-bg)" });
    return { fs };
  },
  steps: [
    (tl, { fs }) => fs.forEach((f: ReturnType<typeof figure>) => f.appear(tl)),
    (tl, { fs }) => {
      fs[0].gather(tl, 960, 960);
      fs[1].gather(tl, 680, 960);
      fs[2].gather(tl, 1240, 960);
    },
  ],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-walk/scene.md": "## Walk\n\n- Appear.\n- Walk along a curve.\n",
      "sections/10-a/20-path/scene.md": "## Path\n\n- Appear.\n- Walk along a path.\n",
      "sections/10-a/30-table/scene.md": "## Table\n\n- Appear.\n- Gather at the table.\n",
    },
    {
      "sections/10-a/10-walk/scene.ts": walkString,
      "sections/10-a/20-path/scene.ts": walkElement,
      "sections/10-a/30-table/scene.ts": gather,
    },
  );
