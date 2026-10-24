import { assembleDeck } from "../assemble";
import { travel } from "klappe/fx";
import type { StepAdder, SceneModule } from "../../types";

const SVG = "http://www.w3.org/2000/svg";

// An HTML parcel travels a "d" string that draws on behind it; an SVG dot travels a path element of the
// scene, turning along it. A third scene's path has no length (the fixture's only problem).
const parcel: SceneModule = {
  build(ctx): StepAdder {
    const p = ctx.html.appendChild(document.createElement("div"));
    p.setAttribute("data-parcel", "");
    Object.assign(p.style, { position: "absolute", left: "0", top: "0", width: "0", height: "0" });
    p.innerHTML = `<div style="position:absolute;left:-30px;top:-30px;width:60px;height:60px;border-radius:8px;background:var(--k-accent)"></div>`;
    return travel(ctx, p, { path: "M200 540 L960 540 L960 900", route: "draw" });
  },
  // Step 1 holds, so the state before the travel has a step of its own.
  steps: [(tl) => void tl.set({}, {}, tl.duration() + 0.1), (tl, t: StepAdder) => t(tl)],
};

const given: SceneModule = {
  build(ctx): StepAdder {
    const route = ctx.svg.appendChild(document.createElementNS(SVG, "path"));
    route.setAttribute("d", "M300 300 C 800 100, 1200 900, 1600 600");
    Object.assign(route.style, { fill: "none", stroke: "var(--k-line)", strokeWidth: "4" });
    const dot = ctx.svg.appendChild(document.createElementNS(SVG, "polygon"));
    dot.setAttribute("points", "-30,-20 30,0 -30,20");
    dot.setAttribute("data-dot", "");
    dot.style.fill = "var(--k-fg)";
    return travel(ctx, dot, { path: route, rotate: true, duration: 1 });
  },
  steps: [(tl, t: StepAdder) => t(tl)],
};

const noLength: SceneModule = {
  build(ctx) {
    const d = ctx.html.appendChild(document.createElement("div"));
    return travel(ctx, d, { path: "M10 10" });
  },
  steps: [(tl, t: StepAdder) => t(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Travel\n",
      "sections/10-a/10-parcel/scene.md": "## Parcel\n\n- It waits.\n- It travels.\n",
      "sections/10-a/20-given/scene.md": "## Given\n\n- It travels the path element.\n",
      "sections/10-a/30-no-length/scene.md": "## No length\n\n- A path with no length.\n",
    },
    { "sections/10-a/10-parcel/scene.ts": parcel, "sections/10-a/20-given/scene.ts": given, "sections/10-a/30-no-length/scene.ts": noLength },
  );
