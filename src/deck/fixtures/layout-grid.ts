import { assembleDeck } from "../assemble";
import { gsap } from "gsap";
import type { SceneModule } from "../../types";

// Three scenes with the default title, and one whose own title sits 10 px right of theirs: one near-miss.
const off: SceneModule = {
  build(ctx) {
    const h = ctx.html.appendChild(document.createElement("h2"));
    h.textContent = ctx.doc!.title;
    Object.assign(h.style, { position: "absolute", left: "170px", top: "140px", margin: "0" });
    gsap.set(h, { autoAlpha: 0 });
    return h;
  },
  steps: [(tl, h: HTMLElement) => void tl.to(h, { autoAlpha: 1, duration: 0.3 })],
};
const text = (t: string) => `## ${t}\n\n- ${t} says one thing.\n`;
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-one/scene.md": text("One"),
      "sections/10-a/20-two/scene.md": text("Two"),
      "sections/10-a/30-off/scene.md": text("Off"),
      "sections/10-a/40-three/scene.md": text("Three"),
    },
    { "sections/10-a/30-off/scene.ts": off },
  );
