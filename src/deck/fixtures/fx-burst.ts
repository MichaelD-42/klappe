import { gsap } from "gsap";
import { burst, type BurstHandle } from "klappe/fx";
import type { SceneModule } from "../../types";
import { assembleDeck } from "../assemble";

// A label that fades in on its step, so the step shows a change even with reduced motion (no burst then).
function label(html: HTMLElement, text: string, x: number, y: number): HTMLElement {
  const d = html.appendChild(document.createElement("div"));
  d.textContent = text;
  Object.assign(d.style, { position: "absolute", left: `${x - 400}px`, top: `${y - 40}px`, width: "800px", textAlign: "center", fontSize: "56px" });
  gsap.set(d, { autoAlpha: 0 });
  return d;
}

// The default burst from the centre, then a small one with its own count, radius, duration and seed.
const pop: SceneModule = {
  build(ctx) {
    const big = burst(ctx, { origin: { x: 960, y: 500 }, seed: 1 });
    const small = burst(ctx, { origin: { x: 1500, y: 800 }, seed: 9, count: 40, radius: 200, duration: 0.8 });
    return { big, small, a: label(ctx.html, "Milestone reached", 960, 500), b: label(ctx.html, "And another", 1500, 800) };
  },
  steps: [
    (tl, { big, a }: { big: BurstHandle; a: HTMLElement }) => {
      tl.to(a, { autoAlpha: 1, duration: 0.4 });
      big.pop(tl, "<");
    },
    (tl, { small, b }: { small: BurstHandle; b: HTMLElement }) => {
      tl.to(b, { autoAlpha: 1, duration: 0.4 });
      small.pop(tl, "<");
    },
  ],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-pop/scene.md": "## Pop\n\n- A milestone pops.\n- A smaller one.\n",
    },
    { "sections/10-a/10-pop/scene.ts": pop },
  );
