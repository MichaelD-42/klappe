import { svg, type SvgHandle } from "klappe/fx";
import plant from "klappe/fx/art/plant.svg?raw";
import { captioned } from "../../../caption";

export default captioned(
  'svg() — exported art keeps its fills; colors maps its hex values to tokens; show, draw, light a layer by id',
  {
    build: (ctx) => svg(ctx, { src: plant, x: 360, y: 140, w: 1200, colors: { "#2a3342": "surface", "#1f6feb": "accent", "#f0b429": "accent-2", "#e6edf3": "fg" } }),
    steps: [
      (tl, a: SvgHandle) => a.show()(tl),
      (tl, a: SvgHandle) => (a.show("tank")(tl), a.show("pump")(tl)),
      (tl, a: SvgHandle) => (a.draw("pipe")(tl), a.show("out")(tl)),
      (tl, a: SvgHandle) => a.light("pump")(tl),
    ],
  },
  "cut",
);
