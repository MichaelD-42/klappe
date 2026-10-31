import { gsap } from "gsap";
import type { OwnTransition, SectionModule } from "klappe/types";

// A bar in the accent colour sweeps over the frame; behind it the canvases swap, and the first step plays as it leaves.
// The bar is one layer, found or made on the first call and reused, only shown and hidden by the timeline.
const wipe: OwnTransition = (from, to) => {
  const back = from.el.parentElement!;
  let bar = back.querySelector<HTMLElement>(":scope > [data-k-wipe]");
  if (!bar) {
    bar = back.appendChild(document.createElement("div"));
    bar.dataset.kWipe = "";
    Object.assign(bar.style, { position: "absolute", inset: "0", zIndex: "2", background: "var(--k-accent)" });
    gsap.set(bar, { autoAlpha: 0 });
  }
  return gsap
    .timeline()
    .fromTo(bar, { xPercent: -100, autoAlpha: 1 }, { xPercent: 0, duration: 0.4, ease: "power2.in" })
    .set(from.el, { autoAlpha: 0 })
    .set(to.el, { autoAlpha: 1 })
    .addLabel("reveal")
    .to(bar, { xPercent: 100, duration: 0.4, ease: "power2.out" })
    .set(bar, { autoAlpha: 0 });
};

const section: SectionModule = { transition: wipe };
export default section;
