import { lineArt, type LineArtHandle } from "klappe/fx";
import desk from "klappe/fx/art/engineer-desk.svg?raw";
import type { SceneModule } from "klappe/types";
import { title } from "../section";

interface Refs {
  h: HTMLElement;
  art: LineArtHandle;
}

const scene: SceneModule = {
  build: (ctx): Refs => ({ h: title(ctx, "Your turn"), art: lineArt(ctx, { src: desk, x: 460, y: 300, w: 1000 }) }),
  steps: [
    (tl, r: Refs) => {
      tl.to(r.h, { autoAlpha: 1, duration: 0.6 });
      r.art.draw(tl);
    },
    (tl, r: Refs) => r.art.glow(tl, ".bulb"),
  ],
};
export default scene;
