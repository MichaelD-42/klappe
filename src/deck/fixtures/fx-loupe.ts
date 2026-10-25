import { assembleDeck } from "../assemble";
import { loupe, type LoupeHandle } from "klappe/fx";
import type { SceneModule, StepAdder } from "../../types";

// A lens over a picture in a rect: it shows, slides to a second detail, then a third. Both moves are built in
// build, the later one first, so bookkeeping done when an adder is made (not when it runs) would show.
// A second scene's picture is missing (the fixture's only problem). The picture is an inline SVG data URL.
const PICTURE =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#1d3557"/><circle cx="400" cy="300" r="60" fill="#e63946"/><circle cx="1200" cy="600" r="60" fill="#2a9d8f"/></svg>',
  );

interface Refs {
  lens: LoupeHandle;
  first: StepAdder;
  second: StepAdder;
}

const lens: SceneModule = {
  build(ctx): Refs {
    const lens = loupe(ctx, { href: "media/dots.svg", alt: "A red and a green dot", rect: { x: 160, y: 90, w: 1600, h: 900 }, r: 150, zoom: 2, at: { x: 560, y: 390 } });
    const second = lens.to(960, 540);
    const first = lens.to(1360, 690);
    return { lens, first, second };
  },
  steps: [(tl, r: Refs) => r.lens.show(tl), (tl, r: Refs) => r.first(tl), (tl, r: Refs) => r.second(tl)],
};

const missing: SceneModule = {
  build: (ctx) => loupe(ctx, { href: "media/gone.png", alt: "A picture not made yet" }),
  steps: [(tl, l: LoupeHandle) => l.show(tl), (tl, l: LoupeHandle) => l.to(100, 100)(tl)],
};

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Loupe\n",
      "sections/10-a/10-lens/scene.md": "## Lens\n\n- On the red dot.\n- On the green dot.\n- On the middle.\n",
      "sections/10-a/20-missing/scene.md": "## Missing\n\n- The stand-in.\n- It holds.\n",
    },
    { "sections/10-a/10-lens/scene.ts": lens, "sections/10-a/20-missing/scene.ts": missing },
  );
  r.deck.files = { data: {}, media: { "media/dots.svg": PICTURE } };
  return r;
};
