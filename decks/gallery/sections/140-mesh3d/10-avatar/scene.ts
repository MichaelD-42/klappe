import { mesh3d, type Mesh3dHandle } from "klappe/fx";
import { captioned } from "../../../caption";

// The mesh fills the frame above the caption strip at y 960; it forms out of the top-left corner.
export default captioned("mesh3d() — a 3D mesh turns on its own: show, mood, collapse", {
  build: (ctx) => mesh3d(ctx, { x: 960, y: 470, size: 760, seed: 1 }),
  steps: [
    (tl, m: Mesh3dHandle) => m.show(tl, undefined, { from: { x: 200, y: 160 } }),
    (tl, m: Mesh3dHandle) => m.mood(tl, "curious"),
    (tl, m: Mesh3dHandle) => m.collapse(tl),
  ],
}, "cut");
