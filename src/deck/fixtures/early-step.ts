import { gsap } from "gsap";
import { assembleDeck } from "../assemble";
import type { SceneModule } from "../../types";

// Broken on purpose: step 2 opens with "-=", so its tween starts inside step 1: a deck problem at build.
const scene: SceneModule = {
  build(ctx) {
    const p = document.createElement("p");
    p.textContent = "Early";
    ctx.html.append(p);
    gsap.set(p, { autoAlpha: 0 });
    return { p };
  },
  steps: [
    (tl, { p }) => void tl.to(p, { autoAlpha: 1, duration: 0.6 }),
    (tl, { p }) => void tl.to(p, { x: 40, duration: 0.6 }, "-=0.3"),
  ],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-early/scene.md": "## Early\n\n- One.\n- Two.\n",
    },
    { "sections/10-a/10-early/scene.ts": scene },
  );
