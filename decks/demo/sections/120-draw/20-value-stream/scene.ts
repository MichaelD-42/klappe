import { lineArt } from "klappe/fx";
import stream from "klappe/fx/art/value-stream.svg?raw";
import { captioned } from "../../../caption";

export default captioned('lineArt() with klappe/fx/art/value-stream.svg — a shipped drawing; glow(tl, ".lead")', {
  build: (ctx) => lineArt(ctx, { src: stream, x: 260, y: 120, w: 1400 }),
  steps: [(tl, a) => a.draw(tl), (tl, a) => a.glow(tl, ".lead")],
});
