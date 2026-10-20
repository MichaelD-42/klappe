import { assembleDeck } from "../assemble";
import { callout, code, type CodeHandle } from "klappe/fx";
import { gsap } from "gsap";
import type { SceneModule } from "../../types";

// One scene per target kind: a code line, a plain box standing in for a flow node, and a point; plus one
// callout whose label cannot fit the frame (the fixture's only problem).
const md = (title: string) => `## ${title}\n\n- Show.\n- Callout.\n`;
const SRC = "const data = load();\nconst bad = check(data);\nsave(bad);";

const onCode: SceneModule = {
  build(ctx) {
    const h = code(ctx, { src: SRC, lang: "js", x: 160, y: 200, w: 1000, h: 400 });
    return { h, c: callout(ctx, { target: h.line(2), text: "This line is the bug", side: "right" }) };
  },
  steps: [(tl, r: { h: CodeHandle }) => r.h.show(tl), (tl, r) => r.c.show(tl)],
};

const onNode: SceneModule = {
  build(ctx) {
    const node = document.createElement("div");
    node.textContent = "Flow node";
    Object.assign(node.style, {
      position: "absolute", left: "700px", top: "400px", width: "300px", height: "120px", boxSizing: "border-box",
      border: "3px solid var(--k-line)", borderRadius: "12px", background: "var(--k-surface)", color: "var(--k-fg)",
      font: "600 36px var(--k-font)", display: "flex", alignItems: "center", justifyContent: "center",
    });
    ctx.html.append(node);
    gsap.set(node, { autoAlpha: 0 });
    return { node, c: callout(ctx, { target: node, text: "Where the data enters", side: "top", offset: 160 }) };
  },
  steps: [(tl, r) => tl.to(r.node, { autoAlpha: 1, duration: 0.6 }), (tl, r) => r.c.show(tl)],
};

const onPoint: SceneModule = {
  build: (ctx) => ({ c: callout(ctx, { target: { x: 400, y: 500 }, text: "A point on the scene", side: "bottom", offset: 100 }) }),
  steps: [(tl, r) => r.c.show(tl)],
};

const tooFar: SceneModule = {
  build: (ctx) => ({ c: callout(ctx, { target: { x: 100, y: 500 }, text: "Out of the frame", side: "left" }) }),
  steps: [(tl, r) => r.c.show(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Callouts\n",
      "sections/10-a/10-code/scene.md": md("Code line"),
      "sections/10-a/20-node/scene.md": md("Node"),
      "sections/10-a/30-point/scene.md": "## Point\n\n- Callout.\n",
      "sections/10-a/40-far/scene.md": "## Out of frame\n\n- Callout.\n",
    },
    {
      "sections/10-a/10-code/scene.ts": onCode,
      "sections/10-a/20-node/scene.ts": onNode,
      "sections/10-a/30-point/scene.ts": onPoint,
      "sections/10-a/40-far/scene.ts": tooFar,
    },
  );
