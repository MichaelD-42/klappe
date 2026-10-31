import { assembleDeck } from "../assemble";
import { text, typeSize } from "klappe/fx";
import type { Components } from "../../types";

// A deck's own fences: stamp draws the fence body, then the scene's second step; ts shadows the built-in code fence,
// so it never runs (a deck problem); broken throws, so its scene shows EFFECT MISSING. A stamp scene with three items
// gets two step functions: a deck problem. nope is registered nowhere: a code fence in a language Shiki does not bundle.
const components: Components = {
  stamp: (ctx, body, info) => {
    const a = text(ctx, { text: body, x: 160, y: 200, w: 1200, size: 72 });
    a.el.dataset.stamp = info;
    const b = text(ctx, { text: ctx.doc!.steps[1].text, x: 160, y: 400, w: 1200 });
    b.el.dataset.stampNext = "";
    return [a.show, b.show];
  },
  // The step reads a token when it runs, so a section's own tokens must reach it.
  sized: (ctx) => {
    const a = text(ctx, { text: "Sized", x: 160, y: 200, w: 1200 });
    return [
      (tl) => {
        a.el.dataset.sized = String(typeSize("body", 44));
        a.show(tl);
      },
    ];
  },
  broken: () => {
    throw new Error("no photo");
  },
  ts: (ctx) => {
    ctx.html.appendChild(document.createElement("div")).dataset.shadow = "";
    return [];
  },
};

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Components\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-own/scene.md": "## Own\n\n```stamp wide\nHello\n```\n\n- One.\n- Two.\n",
      "sections/10-a/20-plain/scene.md": "## Plain\n\n```nope\nx = 1\n```\n\n- One.\n",
      "sections/10-a/30-shadow/scene.md": "## Shadow\n\n```ts\nconst a = 1;\n```\n\n- One.\n",
      "sections/10-a/40-broken/scene.md": "## Broken\n\n```broken\n```\n\n- One.\n",
      "sections/10-a/50-short/scene.md": "## Short\n\n```stamp\nHi\n```\n\n- One.\n- Two.\n- Three.\n",
      "sections/20-b/section.md": "# B\n",
      "sections/20-b/10-sized/scene.md": "## Gap\n\n```sized\n```\n\n- One.\n",
    },
    { "sections/20-b/section.ts": { tokens: { "--k-size-body": "88px" } } },
  );
  r.deck.components = components;
  return r;
};
