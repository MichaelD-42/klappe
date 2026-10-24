import { lineArt, mesh3d, type LineArtHandle, type Mesh3dHandle } from "klappe/fx";
import desk from "klappe/fx/art/engineer-desk.svg?raw";
import type { SceneModule } from "klappe/types";
import { title } from "../section";

interface Refs {
  h: HTMLElement;
  art: LineArtHandle;
  mesh: Mesh3dHandle;
}

const scene: SceneModule = {
  build: (ctx): Refs => ({
    h: title(ctx, ctx.doc!.title),
    art: lineArt(ctx, { src: desk, x: 460, y: 300, w: 1000 }),
    // A quiet helper beside the desk: calm while the pairs form, insight when the bulb lights.
    mesh: mesh3d(ctx, { x: 1660, y: 560, size: 360 }),
  }),
  steps: [
    (tl, r: Refs) => {
      tl.to(r.h, { autoAlpha: 1, duration: 0.6 });
      r.art.draw(tl);
      r.mesh.show(tl, "<");
    },
    (tl, r: Refs) => {
      r.art.glow(tl, ".bulb");
      r.mesh.mood(tl, "insight", "<");
    },
  ],
};
export default scene;
