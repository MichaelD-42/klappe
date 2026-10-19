import { gsap } from "gsap";
import { assembleDeck } from "../assemble";
import type { SceneModule } from "../../types";

// Broken on purpose: onUpdate writes a call count into one inline style property (?prop=strokeDasharray,
// strokeDashoffset, filter, fillOpacity or color), not a function of progress, so the walk must fail.
let calls = 0;
const write: Record<string, (n: number) => string> = {
  strokeDasharray: (n) => `${n}`,
  strokeDashoffset: (n) => `${n}`,
  filter: (n) => `blur(${n}px)`,
  fillOpacity: (n) => `${(n % 100) / 100}`, // computed fill-opacity clamps to 0..1
  color: (n) => `rgb(${n % 256}, 0, 0)`,
};
const scene: SceneModule = {
  build(ctx) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M 100 100 L 600 100");
    path.style.stroke = "var(--k-fg)";
    ctx.svg.append(path);
    return { path };
  },
  steps: [
    (tl, { path }) => {
      const prop = new URLSearchParams(location.search).get("prop") ?? "filter";
      tl.to({}, { duration: 0.6, onUpdate: () => void ((path.style as any)[prop] = write[prop](++calls)) });
    },
  ],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-style/scene.md": "## Style\n\n- Style.\n",
    },
    { "sections/10-a/10-style/scene.ts": scene },
  );
