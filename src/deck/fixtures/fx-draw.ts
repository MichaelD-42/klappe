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

// drawOn on plain shapes: default timing, then custom timing on a scaled group with non-scaling strokes.
const shapes: SceneModule = {
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
    return { plain: group("translate(260 300) scale(5)", false), thin: group("translate(1060 300) scale(5)", true) };
  },
  steps: [(tl, r) => drawOn(r.plain)(tl), (tl, r) => drawOn(r.thin.children, { duration: 0.5, each: 0.3 })(tl)],
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
    },
    {
      "sections/10-a/10-desk/scene.ts": art(desk, ".bulb"),
      "sections/10-a/20-stream/scene.ts": art(stream, ".lead"),
      "sections/10-a/30-shapes/scene.ts": shapes,
    },
  );
