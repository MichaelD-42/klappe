import { assembleDeck } from "../assemble";
import { wipe, type WipeHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// Before and after: a full-frame wipe that stops halfway and then completes, a wipe in a rect, and one
// whose after picture is missing. The pictures are inline SVG data URLs, so tests need no files.
const picture = (fill: string, mark: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="1920" height="1080" fill="${fill}"/><circle cx="960" cy="540" r="300" fill="${mark}"/></svg>`,
  );

const full: SceneModule = {
  build: (ctx) => wipe(ctx, { before: { href: "media/before.svg", alt: "A grey dot" }, after: { href: "media/after.svg", alt: "A green dot" } }),
  steps: [(tl, w: WipeHandle) => w.show(tl), (tl, w: WipeHandle) => w.to(0.5)(tl), (tl, w: WipeHandle) => w.to(1)(tl)],
};

const inRect: SceneModule = {
  build: (ctx) =>
    wipe(ctx, { before: { href: "media/before.svg", alt: "A grey dot" }, after: { href: "media/after.svg", alt: "A green dot" }, rect: { x: 960, y: 200, w: 800, h: 450 } }),
  steps: [(tl, w: WipeHandle) => w.show(tl), (tl, w: WipeHandle) => w.to(1)(tl)],
};

const missing: SceneModule = {
  build: (ctx) => wipe(ctx, { before: { href: "media/before.svg", alt: "A grey dot" }, after: { href: "media/gone.png", alt: "A picture not made yet" } }),
  steps: [(tl, w: WipeHandle) => w.show(tl)],
};

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Wipe\n",
      "sections/10-a/10-full/scene.md": "## Full\n\n- Before.\n- Halfway.\n- After.\n",
      "sections/10-a/20-in-rect/scene.md": "## In a rect\n\n- Before.\n- After.\n",
      "sections/10-a/30-missing/scene.md": "## Missing\n\n- Before only.\n",
    },
    { "sections/10-a/10-full/scene.ts": full, "sections/10-a/20-in-rect/scene.ts": inRect, "sections/10-a/30-missing/scene.ts": missing },
  );
  r.deck.files = { data: {}, media: { "media/before.svg": picture("#555555", "#999999"), "media/after.svg": picture("#1d3557", "#2a9d8f") } };
  return r;
};
