import { assembleDeck } from "../assemble";
import { drawOn, lineArt } from "klappe/fx";
import desk from "klappe/fx/art/engineer-desk.svg?raw";
import stream from "klappe/fx/art/value-stream.svg?raw";
import type { SceneModule } from "../../types";

const SVG = "http://www.w3.org/2000/svg";

// Line art from a file, drawn stroke by stroke, then a part glows warm.
const art = (src: string, part: string): SceneModule => ({
  build: (ctx) => lineArt(ctx, { src, x: 260, y: 120, w: 1400 }),
  steps: [(tl, a) => a.draw(tl), (tl, a) => a.glow(tl, part)],
});

// drawOn on plain shapes without a pathLength (lines and circles too): default timing, then custom timing on a scaled group with non-scaling strokes.
const shapes: SceneModule = {
  build(ctx) {
    const group = (transform: string, nonScaling: boolean) => {
      const g = document.createElementNS(SVG, "g");
      g.setAttribute("transform", transform);
      g.innerHTML = '<path d="M0 0 H100 V60 H0 Z"/><circle cx="50" cy="30" r="20"/><path d="M0 80 Q50 120 100 80"/><line x1="0" y1="140" x2="100" y2="140"/>';
      for (const s of g.children) {
        if (nonScaling) s.setAttribute("vector-effect", "non-scaling-stroke");
        Object.assign((s as SVGElement).style, { fill: "none", stroke: "var(--k-fg)", strokeWidth: "6", strokeLinecap: "round" });
      }
      ctx.svg.append(g);
      return g;
    };
    return { plain: group("translate(260 300) scale(5)", false), thin: group("translate(1060 300) scale(5)", true) };
  },
  steps: [(tl, r) => drawOn(r.plain)(tl), (tl, r) => drawOn(r.thin.children, { duration: 0.5, each: 0.3 })(tl)],
};

// drawOn on dashed strokes: one dashed by style, one by attribute with its own pathLength.
const dashed: SceneModule = {
  build(ctx) {
    const g = document.createElementNS(SVG, "g");
    g.innerHTML =
      '<path d="M260 400 H1660" style="fill:none;stroke:var(--k-fg);stroke-width:6;stroke-dasharray:8 6"/>' +
      '<path d="M260 600 H1660" pathLength="100" stroke-dasharray="10 5" style="fill:none;stroke:var(--k-fg);stroke-width:6"/>';
    ctx.svg.append(g);
    return g;
  },
  steps: [(tl, g) => drawOn(g)(tl)],
};

const md = (title: string) => `## ${title}\n\n- Draw.\n- Second step.\n`;

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-desk/scene.md": md("Desk"),
      "sections/10-a/20-stream/scene.md": md("Stream"),
      "sections/10-a/30-shapes/scene.md": md("Shapes"),
      "sections/10-a/40-dashed/scene.md": "## Dashed\n\n- Draw.\n",
    },
    {
      "sections/10-a/10-desk/scene.ts": art(desk, ".bulb"),
      "sections/10-a/20-stream/scene.ts": art(stream, ".lead"),
      "sections/10-a/30-shapes/scene.ts": shapes,
      "sections/10-a/40-dashed/scene.ts": dashed,
    },
  );
