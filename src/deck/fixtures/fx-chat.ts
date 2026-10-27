import { assembleDeck } from "../assemble";
import { chat, chatMessage, type ChatHandle } from "klappe/fx";
import type { SceneModule, StepAdder } from "../../types";

// The chat thread: five messages from scene.md in a short panel, so the last ones scroll the first ones up; and
// three messages whose next() adders are made in reverse order in build, which must still land in step order; a
// thread from a chat fence in scene.md alone; and avatars: a picture for the user and Ana, initials for Bo, who has
// none, and initials for Cy, whose file is missing (the fixture's only problem).
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

type Faces = { h: ChatHandle };
const faces: SceneModule = {
  build: (ctx): Faces => ({
    h: chat(ctx, {
      x: 360, y: 160, w: 1200, h: 700,
      messages: ["user: Who reviews this?", "Ana: I do.", "Bo: Me too.", "Cy: And me."].map(chatMessage),
      avatars: { user: "media/user.png", Ana: "media/ana.png", Cy: "media/cy.png" },
    }),
  }),
  steps: [(tl, r: Faces) => (r.h.show(tl), r.h.next()(tl)), (tl, r: Faces) => r.h.next()(tl), (tl, r: Faces) => r.h.next()(tl), (tl, r: Faces) => r.h.next()(tl)],
};
// A 1x1 PNG: the avatar's pixels do not matter here, only that the picture is there.
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkqPhfDwAEhgGAWkJfLQAAAABJRU5ErkJggg==";

export default () => {
  const r = assembleDeck(
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
      "sections/10-a/30-markdown/scene.md": "## Markdown\n\n```chat\nuser: Where do I start?\nWith the three checks that block a release.\n```\n\n- Ask.\n- The answer streams in.\n",
      "sections/10-a/40-faces/scene.md": "## Faces\n\n- One.\n- Two.\n- Three.\n- Four.\n",
    },
    { "sections/10-a/10-thread/scene.ts": thread, "sections/10-a/20-order/scene.ts": order, "sections/10-a/40-faces/scene.ts": faces },
  );
  r.deck.files = { data: {}, media: { "media/user.png": PNG, "media/ana.png": PNG } };
  return r;
};
