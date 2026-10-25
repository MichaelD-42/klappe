import { gsap } from "gsap";
import type { Ctx, SceneModule } from "../../types";
import { assembleDeck } from "../assemble";

const SVG = "http://www.w3.org/2000/svg";

// A chip (HTML) and a dot (SVG) that share their data-k-match keys across sections. Hidden; step 1 shows them.
function scene(chip: { x: number; y: number; size: number }, dot: { cx: number; cy: number; r: number }): SceneModule {
  return {
    build(ctx: Ctx) {
      const c = document.createElement("div");
      c.textContent = "Chip";
      c.dataset.kMatch = "chip";
      Object.assign(c.style, { position: "absolute", left: `${chip.x}px`, top: `${chip.y}px`, padding: "8px 24px", fontSize: `${chip.size}px`, background: "var(--k-accent)", color: "var(--k-bg)" });
      ctx.html.append(c);
      const d = document.createElementNS(SVG, "circle");
      for (const [k, v] of Object.entries(dot)) d.setAttribute(k, String(v));
      d.setAttribute("fill", "var(--k-fg)");
      d.dataset.kMatch = "dot";
      ctx.svg.append(d);
      gsap.set([c, d], { autoAlpha: 0 });
      return { shown: [c, d] };
    },
    steps: [(tl, { shown }) => tl.to(shown, { autoAlpha: 1, duration: 0.6 })],
  };
}

// a to b: the chip and the dot fly to new places and sizes. b to c: no shared key, a plain fade.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-one/scene.md": "## One\n\n- Chip and dot.\n",
      "sections/20-b/section.md": "# B\n",
      "sections/20-b/10-two/scene.md": "## Two\n\n- Moved.\n",
      "sections/30-c/section.md": "# C\n",
      "sections/30-c/10-three/scene.md": "## Three\n\n- Nothing shared.\n",
    },
    {
      "sections/10-a/10-one/scene.ts": scene({ x: 200, y: 300, size: 40 }, { cx: 400, cy: 800, r: 40 }),
      "sections/20-b/section.ts": { transition: "magicMove" },
      "sections/20-b/10-two/scene.ts": scene({ x: 1000, y: 600, size: 80 }, { cx: 1500, cy: 300, r: 120 }),
      "sections/30-c/section.ts": { transition: "magicMove" },
    },
  );
