import { gsap } from "gsap";
import { assembleDeck } from "../assemble";

// 8 px text shown at both steps, so the walk fails at each: bail must stop after the first.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-b/scene.md": "## Tiny\n\n- Show it.\n- Move it.\n",
    },
    {
      "sections/10-a/10-b/scene.ts": {
        build(ctx: any) {
          const p = ctx.html.appendChild(Object.assign(document.createElement("p"), { textContent: "Tiny text" }));
          Object.assign(p.style, { position: "absolute", left: "200px", top: "300px", fontSize: "8px" });
          gsap.set(p, { autoAlpha: 0, x: 0 });
          return { p };
        },
        steps: [
          (tl: gsap.core.Timeline, r: any) => void tl.fromTo(r.p, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, immediateRender: false }),
          (tl: gsap.core.Timeline, r: any) => void tl.fromTo(r.p, { x: 0 }, { x: 100, duration: 0.4, immediateRender: false }),
        ],
      },
    },
  );
