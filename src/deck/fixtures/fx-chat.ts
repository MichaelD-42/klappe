import { assembleDeck } from "../assemble";
import { chat, chatMessage, type ChatHandle } from "klappe/fx";
import type { SceneModule, StepAdder } from "../../types";

// The chat thread: five messages from scene.md in a short panel, so the last ones scroll the first ones up; and
// three messages whose next() adders are made in reverse order in build, which must still land in step order.
const thread: SceneModule = {
  build: (ctx) => chat(ctx, { x: 360, y: 160, w: 1200, h: 520, messages: ctx.doc!.steps.map((s) => chatMessage(s.text)) }),
  steps: [
    (tl, h: ChatHandle) => {
      h.show(tl);
      h.next()(tl);
    },
    ...[1, 2, 3, 4].map(() => (tl: gsap.core.Timeline, h: ChatHandle) => h.next()(tl)),
  ],
};

const order: SceneModule = {
  build(ctx) {
    const h = chat(ctx, { x: 360, y: 160, w: 1200, h: 700, messages: ["user: one", "two", "user: three"].map(chatMessage) });
    return { h, adders: [h.next(), h.next(), h.next()].reverse() };
  },
  steps: [
    (tl, r: { h: ChatHandle; adders: StepAdder[] }) => (r.h.show(tl), r.adders[0](tl)),
    (tl, r: { adders: StepAdder[] }) => r.adders[1](tl),
    (tl, r: { adders: StepAdder[] }) => r.adders[2](tl),
  ],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Chat\n",
      "sections/10-a/10-thread/scene.md": [
        "## Thread",
        "",
        "- user: Can the build run on my laptop?",
        "- Yes. Run npm ci once, then npm test. The first run downloads the browsers, so it takes a few minutes.",
        "- Ana: I can pair with you on it after lunch.",
        "- user: Thanks, both of you!",
        "- Any time. Tell me if a test fails and paste its output here.",
        "",
      ].join("\n"),
      "sections/10-a/20-order/scene.md": "## Order\n\n- One.\n- Two.\n- Three.\n",
    },
    { "sections/10-a/10-thread/scene.ts": thread, "sections/10-a/20-order/scene.ts": order },
  );
