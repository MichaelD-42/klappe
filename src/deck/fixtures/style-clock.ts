import { assembleDeck } from "../assemble";
import type { SceneModule } from "../../types";

// Broken on purpose: onUpdate writes a call count into one property the walk records (?prop=, a key of
// write below), not a function of progress, so the walk must fail.
let calls = 0;
const style = (prop: string, v: (n: number) => string) => (e: SVGElement, n: number) => void ((e.style as any)[prop] = v(n));
const write: Record<string, (e: SVGElement, n: number) => void> = {
  opacity: style("opacity", (n) => `${(n % 100) / 100}`),
  transform: style("transform", (n) => `translateX(${n}px)`),
  transformAttr: (e, n) => e.setAttribute("transform", `translate(${n} 0)`),
  progress: (e, n) => e.setAttribute("data-k-progress", `${n}`),
  strokeDasharray: style("strokeDasharray", (n) => `${n}`),
  strokeDashoffset: style("strokeDashoffset", (n) => `${n}`),
  filter: style("filter", (n) => `blur(${n}px)`),
  fillOpacity: style("fillOpacity", (n) => `${(n % 100) / 100}`), // computed fill-opacity clamps to 0..1
  color: style("color", (n) => `rgb(${n % 256}, 0, 0)`),
  stroke: style("stroke", (n) => `rgb(0, ${n % 256}, 0)`),
  outlineColor: style("outlineColor", (n) => `rgb(0, 0, ${n % 256})`),
  borderColor: style("borderColor", (n) => `rgb(${n % 256}, ${n % 256}, 0)`),
  zIndex: style("zIndex", (n) => `${n}`),
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
      tl.to({}, { duration: 0.6, onUpdate: () => write[prop](path, ++calls) });
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
