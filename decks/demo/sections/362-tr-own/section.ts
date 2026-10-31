import { gsap } from "gsap";
import type { OwnTransition, SectionModule } from "klappe/types";

// A bar in the accent colour sweeps over the frame; behind it the canvases swap, and the first step plays as it leaves.
const wipe: OwnTransition = (from, to) => {
  const back = from.el.parentElement!;
  const bar = back.appendChild(document.createElement("div"));
  Object.assign(bar.style, { position: "absolute", inset: "0", background: "var(--k-accent)" });
  return gsap
    .timeline()
    .fromTo(bar, { xPercent: -100 }, { xPercent: 0, duration: 0.4, ease: "power2.in" })
    .set(from.el, { autoAlpha: 0 })
    .set(to.el, { autoAlpha: 1 })
    .addLabel("reveal")
    .to(bar, { xPercent: 100, duration: 0.4, ease: "power2.out" })
    .call(() => bar.remove());
};

const section: SectionModule = { transition: wipe };
export default section;
