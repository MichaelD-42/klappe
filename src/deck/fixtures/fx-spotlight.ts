import { assembleDeck } from "../assemble";
import { spotlight, type SpotlightHandle } from "klappe/fx";
import { gsap } from "gsap";
import type { SceneModule } from "../../types";

// Three boxes; the spotlight lands on the first, moves to the second, then to a plain rect over the third,
// and lifts. A second scene points it at an element with no size (the fixture's only problem).
const BOXES = [200, 800, 1400].map((x) => ({ x, y: 340, w: 320, h: 200 }));

function box(ctx: Parameters<NonNullable<SceneModule["build"]>>[0], r: (typeof BOXES)[number], text: string) {
  const d = ctx.html.appendChild(document.createElement("div"));
  d.textContent = text;
  Object.assign(d.style, {
    position: "absolute", left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, boxSizing: "border-box",
    border: "3px solid var(--k-line)", borderRadius: "12px", background: "var(--k-surface)", color: "var(--k-fg)",
    font: "600 36px var(--k-font)", display: "flex", alignItems: "center", justifyContent: "center",
  });
  gsap.set(d, { autoAlpha: 0 });
  return d;
}

const boxes: SceneModule = {
  build: (ctx) => ({ boxes: BOXES.map((r, i) => box(ctx, r, `Box ${i + 1}`)), s: spotlight(ctx) }),
  steps: [
    (tl, r: { boxes: HTMLElement[] }) => void tl.to(r.boxes, { autoAlpha: 1, duration: 0.6 }),
    (tl, r: { boxes: HTMLElement[]; s: SpotlightHandle }) => r.s.on(r.boxes[0])(tl),
    (tl, r: { boxes: HTMLElement[]; s: SpotlightHandle }) => r.s.on(r.boxes[1])(tl),
    (tl, r: { s: SpotlightHandle }) => r.s.on(BOXES[2])(tl),
    (tl, r: { s: SpotlightHandle }) => r.s.off(tl),
  ],
};

const noSize: SceneModule = {
  build(ctx) {
    const hidden = ctx.html.appendChild(document.createElement("div"));
    hidden.style.display = "none";
    return { hidden, s: spotlight(ctx) };
  },
  steps: [(tl, r: { hidden: HTMLElement; s: SpotlightHandle }) => r.s.on(r.hidden)(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Spotlight\n",
      "sections/10-a/10-boxes/scene.md": "## Boxes\n\n- Three boxes.\n- The first.\n- The second.\n- A rect over the third.\n- All again.\n",
      "sections/10-a/20-no-size/scene.md": "## No size\n\n- A target with no size.\n",
    },
    { "sections/10-a/10-boxes/scene.ts": boxes, "sections/10-a/20-no-size/scene.ts": noSize },
  );
