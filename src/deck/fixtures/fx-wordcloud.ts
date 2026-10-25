import { assembleDeck } from "../assemble";
import { wordCloud } from "klappe/fx";
import type { SceneModule, StepAdder } from "../../types";

// A plain scene to play from, then a word cloud from sample data: the top three words, then the rest. The
// adders are made out of step order (the rest first), so their bookkeeping must happen when the step is added.
const cloud: SceneModule = {
  build: (ctx) => {
    const c = wordCloud(ctx, { src: "data/words.csv", rect: { x: 160, y: 80, w: 1600, h: 840 } });
    return { c, rest: c.show(3), top: c.show(0, 3) };
  },
  steps: [(tl, x: { top: StepAdder }) => x.top(tl), (tl, x: { rest: StepAdder }) => x.rest(tl)],
};

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Words\n",
      "sections/10-a/05-before/scene.md": "## Before\n\n- Nothing yet.\n",
      "sections/10-a/10-cloud/scene.md": "## Cloud\n\n- Top three.\n- The rest.\n",
    },
    { "sections/10-a/10-cloud/scene.ts": cloud },
  );
  r.deck.files = {
    data: {
      "data/words.csv":
        "# source: klappe demo sample\nword,mentions\nOwnership,42\nTrust,38\nFeedback,31\nFocus,27\nSpeed,24\nQuality,22\nLearning,19\nClarity,17\nSafety,15\nCustomers,14\nFlow,12\nCraft,11\nData,10\nKaizen,9\nRespect,8\nCourage,7\nPace,6\nHumour,5\nWWWWW,4\n",
    },
    media: {},
  };
  return r;
};
