import { bigType } from "klappe/fx";
import type { Ctx } from "../../types";
import { assembleDeck } from "../assemble";

// bigType: a word in the default frame, a number in its own rect, a picture and a video through the letters, a missing picture.
// The picture is a data URL; the clip is routed by the e2e test.
const PNG =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#1d3557"/><circle cx="400" cy="300" r="180" fill="#e63946"/></svg>',
  );
const one = (opts: Record<string, unknown>) => ({
  build: (ctx: Ctx) => bigType(ctx, { text: "Shipping", ...opts }),
  steps: [(tl: gsap.core.Timeline, b: ReturnType<typeof bigType>) => b.show(tl)],
});

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-word/scene.md": "## Word\n",
      "sections/10-a/20-number/scene.md": "## Number\n",
      "sections/10-a/30-image/scene.md": "## Image\n",
      "sections/10-a/40-video/scene.md": "## Video\n",
      "sections/10-a/50-missing/scene.md": "## Missing\n",
    },
    {
      "sections/10-a/10-word/scene.ts": one({}),
      "sections/10-a/20-number/scene.ts": one({ text: "42%", rect: { x: 160, y: 140, w: 1000, h: 600 } }),
      "sections/10-a/30-image/scene.ts": one({ media: "media/dot.svg", alt: "A red dot on blue" }),
      "sections/10-a/40-video/scene.ts": one({ media: "media/clip.webm", alt: "A colour wash" }),
      "sections/10-a/50-missing/scene.ts": one({ media: "media/gone.jpg", alt: "A harbour at dawn" }),
    },
  );
  r.deck.files = { data: {}, media: { "media/dot.svg": PNG, "media/clip.webm": "https://klappe.test/clip.webm" } };
  return r;
};
