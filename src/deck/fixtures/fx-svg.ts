import { assembleDeck } from "../assemble";
import { svg, type SvgHandle } from "klappe/fx";
import plant from "klappe/fx/art/plant.svg?raw";
import type { SceneModule } from "../../types";

const COLORS = { "#2a3342": "surface", "#1f6feb": "accent", "#f0b429": "accent-2", "#e6edf3": "fg" };

// A full-colour SVG: the base shows, then each layer by id; one is lit, then all come back.
const art: SceneModule = {
  build: (ctx) => svg(ctx, { src: plant, x: 360, y: 200, w: 1200, colors: COLORS }),
  steps: [
    (tl, a: SvgHandle) => a.show()(tl),
    (tl, a: SvgHandle) => (a.show("tank")(tl), a.show("pump")(tl)),
    (tl, a: SvgHandle) => (a.draw("pipe")(tl), a.show("out")(tl)),
    (tl, a: SvgHandle) => a.light("pump")(tl),
    (tl, a: SvgHandle) => (a.light(null)(tl), a.dim("tank")(tl)),
  ],
};

// Problems: a colour with no token, a <style> block, and a step naming an id the file lacks.
const broken: SceneModule = {
  build: (ctx) =>
    svg(ctx, {
      src: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><style>.a{fill:red}</style><rect id="a" width="50" height="50" fill="#123456"/><rect width="10" height="10" fill="#2a3342"/></svg>',
      x: 160, y: 200, w: 400, colors: { "#2A3342": "surface" },
    }),
  steps: [(tl, a: SvgHandle) => (a.show()(tl), a.show("nope")(tl))],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-art/scene.md": "## Art\n\n- Base.\n- Tank and pump.\n- Pipe and out.\n- Pump lit.\n- All back, tank dimmed.\n",
      "sections/10-a/20-broken/scene.md": "## Broken\n\n- One.\n",
    },
    { "sections/10-a/10-art/scene.ts": art, "sections/10-a/20-broken/scene.ts": broken },
  );
