import { lineArt } from "klappe/fx";
import desk from "klappe/fx/art/engineer-desk.svg?raw";
import { captioned } from "../../10-chart/section";

export default captioned(
  'lineArt() — a trusted SVG draws stroke by stroke; glow() lights one part',
  {
    build: (ctx) => lineArt(ctx, { src: desk, x: 360, y: 100, w: 1200 }),
    steps: [(tl, a) => a.draw(tl), (tl, a) => a.glow(tl, ".bulb")],
  },
  "cut",
);
