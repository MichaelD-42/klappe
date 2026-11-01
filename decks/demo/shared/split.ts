import { gsap } from "gsap";
import { iconTile } from "klappe/fx";
import type { Ctx, SceneModule, StepAdder } from "klappe/types";
import { captionOf } from "../caption";

// The split screen's two scenes: "split-before", and "split-after" placed right of it on the same canvas.
// Each shows its title and a tile, then cuts to both side by side (duration 0: a cut, not a flight). Both views are
// at half size, so the gallery caption, set for a full scene, fades out for the cut.
export function splitHalf(icon: string, tone: string): SceneModule {
  return {
    build(ctx: Ctx) {
      const h = ctx.html.appendChild(document.createElement("h2"));
      h.textContent = ctx.doc!.title;
      Object.assign(h.style, { position: "absolute", left: "160px", top: "140px", margin: "0" });
      gsap.set(h, { autoAlpha: 0 });
      const [a, b] = [ctx.canvas.rects["split-before"], ctx.canvas.rects["split-after"]];
      const both = { x: a.x, y: a.y, w: b.x + b.w - a.x, h: a.h };
      const cut: StepAdder = (tl) => ctx.camera.to(tl, both, { duration: 0 });
      return { h, tile: iconTile(ctx, icon, { x: 960, y: 470, size: 240, tone }), cut };
    },
    steps: [
      (tl, r) => (tl.to(r.h, { autoAlpha: 1, duration: 0.3 }), r.tile.draw(tl, "<")),
      (tl, r, ctx) => (r.cut(tl), tl.to(captionOf(ctx), { autoAlpha: 0, duration: 0.3 }, "<")),
    ],
  };
}
