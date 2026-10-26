import { assembleDeck } from "../assemble";
import type { SceneModule } from "../../types";

// Broken on purpose: step 2's onUpdate skips progress 0, so a step back from it leaves its count on screen.
// Step 1 rewrites the count, so a seek from the start (the walk's reset) is clean: only the step-back check sees it.
const scene: SceneModule = {
  build(ctx) {
    const count = document.createElement("p");
    count.dataset.kText = "";
    count.textContent = "0";
    ctx.html.append(count);
    return { count };
  },
  steps: [
    (tl, { count }) => void tl.to({}, { duration: 0.3, onUpdate: () => void (count.textContent = "0") }),
    (tl, { count }) => {
      const o = { p: 0 };
      tl.to(o, { p: 1, duration: 0.6, onUpdate: () => void (o.p > 0 && (count.textContent = String(Math.round(o.p * 100)))) });
    },
  ],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-back/scene.md": "## Back\n\n- One.\n- Two.\n",
    },
    { "sections/10-a/10-back/scene.ts": scene },
  );
