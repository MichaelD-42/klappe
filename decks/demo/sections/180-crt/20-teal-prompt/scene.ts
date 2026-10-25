import { crt, type CrtHandle } from "klappe/fx";
import type { SceneModule } from "klappe/types";
import { captioned, captionOf } from "../../../caption";

// Teal, settle only (as after a crt transition), then a slow human prompt and a fast agent answer.
const scene = captioned("crt({ color: \"teal\", prompts }) — settle(), prompt(tl, i, { cps }), hideCursor()", {
  build: (ctx) =>
    crt(ctx, {
      color: "teal",
      lines: ["DEMO-OS v1.0", "", "Loading: AI agents ............ OK"],
      prompts: ["> who are you?", "I read. I plan. I act. You approve."],
    }),
  steps: [
    (tl, h: CrtHandle) => h.settle(tl),
    (tl, h: CrtHandle) => h.type(tl, "all"),
    (tl, h: CrtHandle) => h.ready(tl),
    (tl, h: CrtHandle) => {
      h.prompt(tl, 0);
      h.prompt(tl, 1, { cps: 136, at: "+=0.5" });
    },
    (tl, h: CrtHandle) => h.hideCursor(tl),
  ],
});

// The bezel ends at y 1040: the caption moves up to keep clear space above it.
const prompt: SceneModule = {
  ...scene,
  build(ctx) {
    const refs = scene.build!(ctx);
    refs.root.setAttribute("data-k-bleed", ""); // the bezel fills the frame by design
    captionOf(ctx).style.top = "920px";
    return refs;
  },
};
export default prompt;
