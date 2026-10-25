import { assembleDeck } from "../assemble";
import { follow, impactShake, travel } from "klappe/fx";
import type { SceneModule, StepAdder } from "../../types";

// A parcel travels; the camera follows it and the scene jolts when it lands, then the camera flies back to the
// scene's frame. The adders are all made in build, out of step order. A scene before it puts it at canvas x 1920.
const ride: SceneModule = {
  build(ctx) {
    const p = ctx.html.appendChild(document.createElement("div"));
    p.setAttribute("data-parcel", "");
    Object.assign(p.style, { position: "absolute", left: "0", top: "0", width: "0", height: "0" });
    p.innerHTML = `<div style="position:absolute;left:-30px;top:-30px;width:60px;height:60px;border-radius:8px;background:var(--k-accent)"></div>`;
    const ship = travel(ctx, p, { path: "M200 700 C 700 200, 1200 900, 1700 400", duration: 2 });
    const back: StepAdder = (tl) => ctx.camera.to(tl, ctx.rect);
    return { back, shake: impactShake(ctx), cam: follow(ctx, ship), ship };
  },
  steps: [
    (tl) => void tl.set({}, {}, tl.duration() + 0.1), // holds, so the state before the follow has a step of its own
    (tl, r: Record<string, StepAdder>) => (r.ship(tl), r.cam(tl), r.shake(tl)),
    (tl, r: Record<string, StepAdder>) => r.back(tl),
  ],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Camera\n",
      "sections/10-a/10-before/scene.md": "## Before\n\n- A scene first.\n",
      "sections/10-a/20-ride/scene.md": "## Ride\n\n- It waits.\n- It travels, followed.\n- Back to the frame.\n",
      "sections/10-a/30-after/scene.md": "## After\n\n- The next scene.\n",
    },
    { "sections/10-a/20-ride/scene.ts": ride },
  );
