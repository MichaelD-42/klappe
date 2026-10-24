import { assembleDeck } from "../assemble";
import { glow, pulse, shake, type GlowHandle } from "klappe/fx";
import type { StepAdder, SceneModule } from "../../types";

// Two boxes and an SVG circle: box 1 glows on, breathes and goes off; box 2 pulses and shakes; the circle
// glows. A second scene glows a target with no size (the fixture's only problem). A second section is
// another canvas, where box 1's breathe loop must pause.
interface Refs {
  boxes: HTMLElement[];
  g: GlowHandle;
  dot: GlowHandle;
  p: StepAdder;
  s: StepAdder;
}

function box(ctx: Parameters<NonNullable<SceneModule["build"]>>[0], x: number, text: string) {
  const d = ctx.html.appendChild(document.createElement("div"));
  d.textContent = text;
  Object.assign(d.style, {
    position: "absolute", left: `${x}px`, top: "340px", width: "320px", height: "200px", boxSizing: "border-box",
    border: "3px solid var(--k-line)", borderRadius: "12px", background: "var(--k-surface)", color: "var(--k-fg)",
    font: "600 36px var(--k-font)", display: "flex", alignItems: "center", justifyContent: "center",
  });
  return d;
}

const boxes: SceneModule = {
  build(ctx): Refs {
    const b = [box(ctx, 200, "Box 1"), box(ctx, 800, "Box 2")];
    const c = ctx.svg.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "circle"));
    for (const [k, v] of Object.entries({ cx: 1560, cy: 440, r: 80 })) c.setAttribute(k, String(v));
    Object.assign(c.style, { fill: "none", stroke: "var(--k-fg)", strokeWidth: "6" });
    return { boxes: b, g: glow(ctx, b[0]), dot: glow(ctx, c, { color: "--k-warn" }), p: pulse(ctx, b[1]), s: shake(b[1]) };
  },
  steps: [
    (tl, r: Refs) => r.g.on(tl),
    (tl, r: Refs) => r.g.breathe(tl),
    (tl, r: Refs) => r.g.off(tl),
    (tl, r: Refs) => r.p(tl),
    (tl, r: Refs) => r.s(tl),
    (tl, r: Refs) => r.dot.on(tl),
  ],
};

const noSize: SceneModule = {
  build(ctx) {
    const hidden = ctx.html.appendChild(document.createElement("div"));
    hidden.style.display = "none";
    return { g: glow(ctx, hidden) };
  },
  steps: [(tl, r: { g: GlowHandle }) => r.g.on(tl)],
};

const other: SceneModule = { build() {}, steps: [() => {}] };

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Attention\n",
      "sections/10-a/10-boxes/scene.md": "## Boxes\n\n- Glow on.\n- Breathe.\n- Off.\n- Pulse.\n- Shake.\n- The circle glows.\n",
      "sections/10-a/20-no-size/scene.md": "## No size\n\n- A target with no size.\n",
      "sections/20-b/section.md": "# Other\n",
      "sections/20-b/10-other/scene.md": "## Other\n\n- Elsewhere.\n",
    },
    { "sections/10-a/10-boxes/scene.ts": boxes, "sections/10-a/20-no-size/scene.ts": noSize, "sections/20-b/10-other/scene.ts": other },
  );
