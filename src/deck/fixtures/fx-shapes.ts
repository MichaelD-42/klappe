import { assembleDeck } from "../assemble";
import { arrow, shape, tint } from "klappe/fx";
import type { SceneModule } from "../../types";

// A rect that draws on, a circle and a plain arrow that fade in, a bowed accent arrow that draws on, then a word tinted to the
// accent and on to --k-warn. The two tint adders are made in reverse step order: the second must still start
// where the first ends.
const shapes: SceneModule = {
  build(ctx) {
    const word = ctx.html.appendChild(document.createElement("div"));
    word.textContent = "Tinted";
    word.setAttribute("data-word", "");
    Object.assign(word.style, { position: "absolute", left: "1300px", top: "700px", font: "700 72px var(--k-font)", color: "var(--k-fg)" });
    const toWarn = tint(word, { to: "--k-warn" });
    const toAccent = tint(word, { to: "--k-accent" });
    return {
      rect: shape(ctx, { kind: "rect", x: 200, y: 300, w: 400, h: 240 }),
      circle: shape(ctx, { kind: "circle", x: 1100, y: 420, r: 120 }),
      line: shape(ctx, { kind: "line", x: 200, y: 700, x2: 1000, y2: 700 }),
      arrow: arrow(ctx, { from: { x: 600, y: 420 }, to: { x: 970, y: 420 }, curve: 0.2, accent: true }),
      shown: arrow(ctx, { from: { x: 1300, y: 300 }, to: { x: 1600, y: 300 } }),
      toWarn,
      toAccent,
      word,
    };
  },
  steps: [
    (tl, r) => r.rect.draw(tl),
    (tl, r) => {
      r.circle.show(tl);
      r.shown.show(tl);
      r.line.draw(tl);
    },
    (tl, r) => r.arrow.draw(tl),
    (tl, r) => r.toAccent(tl),
    (tl, r) => r.toWarn(tl),
  ],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Shapes\n",
      "sections/10-a/10-shapes/scene.md": "## Shapes\n\n- The rect draws.\n- The circle and an arrow show, the line draws.\n- The arrow draws.\n- Accent.\n- Warn.\n",
    },
    { "sections/10-a/10-shapes/scene.ts": shapes },
  );
