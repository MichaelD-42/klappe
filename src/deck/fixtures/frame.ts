import { assembleDeck } from "../assemble";
import { image, text, type BasicHandle, type ImageHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// frame: 9:16, a vertical deck: the stage, the scene frames, a full-frame picture and the walk follow it.
const full: SceneModule = {
  build: (ctx) => ({
    i: image(ctx, { href: "media/none.png", alt: "A tall picture", rect: { x: 0, y: 0, w: ctx.rect.w, h: ctx.rect.h } }),
    t: text(ctx, { text: "Bottom", x: 80, y: 1700, w: 900 }),
  }),
  steps: [(tl, r: { i: ImageHandle; t: BasicHandle }) => (r.i.show(tl), r.t.show(tl))],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Frame\nframe: 9:16\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-one/scene.md": "## One\n\n- First.\n- Second.\n",
      "sections/10-a/20-full/scene.md": "## Full\n\n- A picture.\n",
    },
    { "sections/10-a/20-full/scene.ts": full },
  );
