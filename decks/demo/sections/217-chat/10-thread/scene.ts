import type { gsap } from "gsap";
import { chat, chatMessage, type ChatHandle } from "klappe/fx";
import { captioned } from "../../../caption";

// One message per list item in scene.md; the last ones scroll the first ones up.
export default captioned("chat(ctx, { messages, avatars }) — next() shows typing dots, then the answer streams in", {
  build: (ctx) =>
    chat(ctx, {
      x: 360, y: 140, w: 1200, h: 620,
      messages: ctx.doc!.steps.map((s) => chatMessage(s.text)),
      avatars: { user: "media/avatar-user.jpeg", Ana: "media/avatar-ana.jpeg" },
    }),
  steps: [
    (tl, h: ChatHandle) => {
      h.show(tl);
      h.next()(tl);
    },
    ...[1, 2, 3, 4].map(() => (tl: gsap.core.Timeline, h: ChatHandle) => h.next()(tl)),
  ],
});
