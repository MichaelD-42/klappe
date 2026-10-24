import { bubble, mesh3d } from "klappe/fx";
import { captioned } from "../../../caption";

type Refs = { m: ReturnType<typeof mesh3d>; beside: ReturnType<typeof bubble>; below: ReturnType<typeof bubble> };

// The mesh fills the frame above the caption strip at y 960; it forms out of the top-left corner.
// A bubble beside it (maxWidth wraps the text) and one below it (side "top": the tail on its top edge).
export default captioned("mesh3d() — a 3D mesh that turns on its own: show, mood, collapse; bubble() beside it", {
  build: (ctx): Refs => ({
    m: mesh3d(ctx, { x: 960, y: 400, size: 640, seed: 1 }),
    beside: bubble(ctx, { x: 1290, y: 400, side: "right", maxWidth: 440, text: "Beside the mesh, wrapped at 440 px." }),
    below: bubble(ctx, { x: 960, y: 730, side: "top", text: "Below the mesh." }),
  }),
  steps: [
    (tl, { m }: Refs) => m.show(tl, undefined, { from: { x: 200, y: 160 } }),
    (tl, { m }: Refs) => m.mood(tl, "curious"),
    (tl, { beside, below }: Refs) => (beside.show(tl), below.show(tl)),
    (tl, { m, beside, below }: Refs) => (beside.hide(tl), below.hide(tl, "<"), m.collapse(tl)),
  ],
}, "cut");
