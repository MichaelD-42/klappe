import { gsap } from "gsap";
import { assembleDeck } from "../assemble";
import type { SceneModule } from "../../types";

// A count-up written from onUpdate as a pure function of the tween's progress: play equals seek.
const scene: SceneModule = {
  build(ctx) {
    const p = document.createElement("p");
    p.dataset.kText = "";
    p.textContent = "0";
    ctx.html.append(p);
    gsap.set(p, { autoAlpha: 0 });
    return { p };
  },
  steps: [
    (tl, { p }) => {
      const o = { v: 0 };
      tl.to(p, { autoAlpha: 1, duration: 0.2 });
      tl.to(o, { v: 100, duration: 0.6, onUpdate: () => void (p.textContent = String(Math.round(o.v))) });
    },
  ],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-count/scene.md": "## Count\n\n- Count up.\n",
    },
    { "sections/10-a/10-count/scene.ts": scene },
  );
