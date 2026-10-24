import { assembleDeck } from "../assemble";
import type { SceneModule } from "../../types";

// Problems raised late, as a helper that measures text once the web font loads: one after
// document.fonts.ready, one on the first played step. The self-test must report both.
const scene: SceneModule = {
  build(ctx) {
    document.fonts.ready.then(() => ctx.problem("late: after fonts.ready"));
    let said = false;
    ctx.onStep((e) => {
      if (!e.play || said) return;
      said = true;
      ctx.problem("late: during the walk");
    });
  },
  steps: [() => {}, () => {}],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-late/scene.md": "## Late\n\n- One.\n- Two.\n",
    },
    { "sections/10-a/10-late/scene.ts": scene },
  );
