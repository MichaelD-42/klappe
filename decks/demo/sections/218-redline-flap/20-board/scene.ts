import { splitFlap, type SplitFlapHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("splitFlap(ctx, { x, y, cells, text }) — each to(text) flips the cells to a new word", {
  build: (ctx) => splitFlap(ctx, { x: 437, y: 360, cells: 10, text: "On time", size: 120 }),
  steps: [(tl, f: SplitFlapHandle) => f.show(tl), (tl, f: SplitFlapHandle) => f.to("Boarding")(tl), (tl, f: SplitFlapHandle) => f.to("98.6% up")(tl)],
});
