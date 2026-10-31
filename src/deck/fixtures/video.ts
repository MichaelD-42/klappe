import { gsap } from "gsap";
import { assembleDeck } from "../assemble";
import type { SceneModule } from "../../types";

// Two canvases, one step each that fades a word in over 0.5 s. b enters through a blackout (0.4 + 0.3 + 0.4 s, then
// its step plays). a holds 1 s by its auto; b has none, so `klappe video` holds it for --hold.
const scene = (text: string, auto?: number): SceneModule => ({
  build(ctx) {
    const p = document.createElement("p");
    p.textContent = text;
    ctx.html.append(p);
    gsap.set(p, { autoAlpha: 0 });
    return { p };
  },
  steps: [(tl, { p }) => void tl.to(p, { autoAlpha: 1, duration: 0.5 })],
  ...(auto !== undefined && { auto: [auto] }),
});

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-one/scene.md": "## One\n\n- One.\n",
      "sections/20-b/section.md": "# B\n",
      "sections/20-b/10-two/scene.md": "## Two\n\n- Two.\n",
    },
    {
      "sections/10-a/10-one/scene.ts": scene("One", 1),
      "sections/20-b/section.ts": { transition: "blackout" },
      "sections/20-b/10-two/scene.ts": scene("Two"),
    },
  );
