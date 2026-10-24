import { gsap } from "gsap";
import { assembleDeck } from "../assemble";

// 40 px text inside a group scaled to 0.3, in HTML and in SVG: about 8.5 px at 1366, so the walk must flag both.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-b/scene.md": "## Small\n\n- Show it.\n",
    },
    {
      "sections/10-a/10-b/scene.ts": {
        build(ctx: any) {
          const box = ctx.html.appendChild(document.createElement("div"));
          Object.assign(box.style, { position: "absolute", left: "200px", top: "300px", transform: "scale(0.3)", transformOrigin: "0 0" });
          box.appendChild(Object.assign(document.createElement("p"), { textContent: "Tiny html" })).style.fontSize = "40px";
          const g = ctx.svg.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "g"));
          g.setAttribute("transform", "translate(200 700) scale(0.3)");
          const t = g.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "text"));
          Object.assign(t, { textContent: "Tiny svg" });
          t.setAttribute("font-size", "40");
          t.setAttribute("fill", "var(--k-fg)");
          gsap.set([box, g], { autoAlpha: 0 });
          return { box, g };
        },
        steps: [(tl: gsap.core.Timeline, r: any) => void tl.to([r.box, r.g], { autoAlpha: 1, duration: 0.6 })],
      },
    },
  );
