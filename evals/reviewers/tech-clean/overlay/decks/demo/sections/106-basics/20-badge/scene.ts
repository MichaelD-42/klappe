import { gsap } from "gsap";
import { title, type BasicHandle } from "klappe/fx";
import { captioned } from "../../../caption";

interface Refs {
  h: BasicHandle;
  badge: HTMLElement;
}

// The badge is built in build() with its start value set there, so the step's fromTo starts where a seek starts.
export default captioned("build hidden, gsap.set the start, tl.fromTo(..., { immediateRender: false }) — an entrance that seeks", {
  build(ctx): Refs {
    const h = title(ctx);
    const badge = document.createElement("div");
    badge.textContent = ctx.doc!.steps[1].text;
    Object.assign(badge.style, {
      position: "absolute", left: "160px", top: "420px", padding: "24px 48px",
      fontSize: "56px", fontWeight: "700", color: "var(--k-bg)", background: "var(--k-accent)",
    });
    ctx.html.append(badge);
    gsap.set(badge, { autoAlpha: 0, x: -240 });
    return { h, badge };
  },
  steps: [
    (tl, r: Refs) => r.h.show(tl),
    (tl, r: Refs) => {
      tl.fromTo(r.badge, { autoAlpha: 0, x: -240 }, { autoAlpha: 1, x: 0, duration: 0.8, ease: "power2.out", immediateRender: false });
    },
  ],
});
