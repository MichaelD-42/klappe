import { gsap } from "gsap";
import type { OwnTransition } from "../../types";
import { assembleDeck } from "../assemble";

// A fade of the new canvas in with a bar layer over both, with a "reveal" at 0. The layer is found or made, and only tweened.
const wipe: OwnTransition = (from, to, opts) => {
  const back = from.el.parentElement!;
  let bar = back.querySelector<HTMLElement>(":scope > [data-k-wipe]");
  if (!bar) {
    bar = back.appendChild(document.createElement("div"));
    bar.dataset.kWipe = "";
    Object.assign(bar.style, { position: "absolute", inset: "0", zIndex: "2", background: "var(--k-accent)" });
    gsap.set(bar, { autoAlpha: 0 });
  }
  const s = Number(opts.seconds ?? 0.5);
  return gsap
    .timeline()
    .addLabel("reveal", 0)
    .set(to.el, { autoAlpha: 1 })
    .fromTo(to.el, { opacity: 0 }, { opacity: 1, duration: s })
    .fromTo(bar, { xPercent: -100, autoAlpha: 1 }, { xPercent: 100, duration: s }, 0)
    .set(bar, { autoAlpha: 0 })
    .set(from.el, { autoAlpha: 0 });
};

// No "reveal" label: a deck problem, and the move plays a fade.
const noReveal: OwnTransition = (from, to) => gsap.timeline().set(from.el, { autoAlpha: 0 }).set(to.el, { autoAlpha: 1 });

// Section b enters with the own wipe (0.5 s, from transitionOptions), section c with a function that has no reveal.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-one/scene.md": "## One\n\n- Before.\n",
      "sections/20-b/section.md": "# B\n",
      "sections/20-b/10-wiped/scene.md": "## Wiped\n\n- After the wipe.\n",
      "sections/30-c/section.md": "# C\n",
      "sections/30-c/10-bad/scene.md": "## Bad\n\n- After the bad one.\n",
    },
    {
      "sections/20-b/section.ts": { transition: wipe, transitionOptions: { seconds: 0.5 } },
      "sections/30-c/section.ts": { transition: noReveal },
    },
  );
