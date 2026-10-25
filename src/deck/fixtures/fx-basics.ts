import { assembleDeck } from "../assemble";
import { hide, show, text, title, type BasicHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

interface Refs {
  h: BasicHandle;
  a: BasicHandle;
  b: BasicHandle;
  c: BasicHandle;
}

// The title from scene.md and a text box; then two boxes at once (a list); then the first box fades out
// and back in, so the walk seeks across a hide and a show of the same element.
const boxes: SceneModule = {
  build: (ctx): Refs => ({
    h: title(ctx),
    a: text(ctx, { text: "Plain text in --k-fg", x: 160, y: 360, w: 800 }),
    b: text(ctx, { text: "Muted and small", x: 160, y: 480, w: 800, size: 32, color: "--k-muted" }),
    c: text(ctx, { text: "Accent and bold", x: 960, y: 480, w: 800, color: "--k-accent", weight: 700 }),
  }),
  steps: [
    (tl, r: Refs) => (r.h.show(tl), r.a.show(tl)),
    (tl, r: Refs) => show([r.b.el, r.c.el])(tl),
    (tl, r: Refs) => hide(r.a.el)(tl),
    (tl, r: Refs) => show(r.a.el, { duration: 0.2 })(tl),
  ],
};

// A colour that is not a token: reported, and the box falls back to --k-fg.
const bad: SceneModule = {
  build: (ctx) => ({ h: title(ctx, "Given title"), t: text(ctx, { text: "Not a token", x: 160, y: 360, w: 800, color: "red" }) }),
  steps: [(tl, r: { h: BasicHandle; t: BasicHandle }) => (r.h.show(tl), r.t.show(tl))],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Basics\n",
      "sections/10-a/10-boxes/scene.md": "## Title from scene.md\n\n- One\n- Two\n- Three\n- Four\n",
      "sections/10-a/20-bad/scene.md": "## Bad\n\n- One\n",
    },
    { "sections/10-a/10-boxes/scene.ts": boxes, "sections/10-a/20-bad/scene.ts": bad },
  );
