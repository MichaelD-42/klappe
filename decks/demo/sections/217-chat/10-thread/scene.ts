import type { gsap } from "gsap";
import { chat, chatMessage, type ChatHandle } from "klappe/fx";
import { captioned } from "../../../caption";

// One message per list item in scene.md; the last ones scroll the first ones up.
export default captioned("chat(ctx, { messages }) — next() shows typing dots, then the answer streams in", {
  build: (ctx) => chat(ctx, { x: 360, y: 100, w: 1200, h: 800, messages: ctx.doc!.steps.map((s) => chatMessage(s.text)) }),
  steps: [
    (tl, h: ChatHandle) => {
      h.show(tl);
      h.next()(tl);
    },
    ...[1, 2, 3, 4].map(() => (tl: gsap.core.Timeline, h: ChatHandle) => h.next()(tl)),
  ],
});
