import { gsap } from "gsap";
import { assembleDeck } from "../assemble";
import type { SceneModule } from "../../types";

// Broken on purpose: onUpdate writes wall-clock time and a call count, neither a function of progress,
// so play and seek differ and the walk must fail. The count keeps them apart when both land in the same millisecond.
let calls = 0;
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
      tl.to(p, { autoAlpha: 1, duration: 0.2 });
      tl.to({}, { duration: 0.6, onUpdate: () => void (p.textContent = `${Math.round(performance.now())} #${++calls}`) });
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
