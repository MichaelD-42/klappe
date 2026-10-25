import { wordCloud, type WordCloudHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("wordCloud(ctx, { src, rect }) — words sized by weight; show(0, 3), then show(3)", {
  build: (ctx) => wordCloud(ctx, { src: "data/words.csv", rect: { x: 160, y: 80, w: 1600, h: 840 } }),
  steps: [(tl, c: WordCloudHandle) => c.show(0, 3)(tl), (tl, c: WordCloudHandle) => c.show(3)(tl)],
});
