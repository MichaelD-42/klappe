import { assembleDeck } from "../assemble";
import { figure } from "klappe/fx";
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
    (tl, { f, route }) => f.walk(tl, route, { duration: 2.5, at: "+=0.2" }),
  ],
};

// Three figures gather at a table. The table is drawn after the figures and filled, so it hides the one behind it.
const gather: SceneModule = {
  build(ctx) {
    title(ctx, "Gather at a table");
    const fs = [
      figure(ctx, { x: 1500, y: 960, scale: 1.25, color: "var(--k-accent)" }),
      figure(ctx, { x: 260, y: 960, scale: 1.25, color: "var(--k-fg)" }),
      figure(ctx, { x: 1760, y: 960, scale: 1.25, color: "var(--k-fg)" }),
    ];
    line(ctx, "M712 960 L712 806 L1208 806 L1208 960", { fill: "var(--k-bg)" }); // table front, open at the floor
    line(ctx, "M160 960 L1760 960"); // floor, over the table front
    line(ctx, "M680 790 L1240 790 L1240 806 L680 806 Z", { fill: "var(--k-bg)" }); // table top
    line(ctx, "M752 782 L752 730 L840 730 L840 782 M736 790 L856 790"); // laptop
    line(ctx, "M1140 788 L1140 754 L1168 754 L1168 788 M1168 762 Q1182 762 1182 771 Q1182 780 1168 780"); // mug
    return { fs };
  },
  steps: [
    (tl, { fs }) => fs.forEach((f: ReturnType<typeof figure>) => f.appear(tl)),
    (tl, { fs }) => {
      fs[0].gather(tl, 960, 955, undefined, 2); // behind the table: feet clear of the floor line
      fs[1].gather(tl, 600, 960, "<", 2);
      fs[2].gather(tl, 1320, 960, "<", 2);
    },
  ],
};

// Seated: one figure seated from load, one that sits down and stands up again.
const seat: SceneModule = {
  build(ctx) {
    title(ctx, "Sit");
    return {
      seated: figure(ctx, { x: 600, y: 900, color: "var(--k-fg)", seated: true }),
      sitter: figure(ctx, { x: 1300, y: 900, color: "var(--k-fg)" }),
    };
  },
  steps: [
    (tl, r) => (r.seated.appear(tl), r.sitter.appear(tl, "<")),
    (tl, r) => r.sitter.sit(tl),
    (tl, r) => r.sitter.stand(tl),
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
      "sections/10-a/40-seat/scene.md": "## Seat\n\n- Appear.\n- Sit.\n- Stand.\n",
    },
    {
      "sections/10-a/10-walk/scene.ts": walkString,
      "sections/10-a/20-path/scene.ts": walkElement,
      "sections/10-a/30-table/scene.ts": gather,
      "sections/10-a/40-seat/scene.ts": seat,
    },
  );
