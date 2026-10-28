import { title, type BasicHandle } from "klappe/fx";
import { captioned } from "../../../caption";

interface Refs {
  h: BasicHandle;
}

// The badge slides in from the left on step 2.
export default captioned("tl.from(badge, { x, autoAlpha }) — a badge slides in", {
  build: (ctx): Refs => ({ h: title(ctx) }),
  steps: [
    (tl, r: Refs) => r.h.show(tl),
    (tl, _r: Refs, ctx) => {
      const badge = document.createElement("div");
      badge.textContent = ctx.doc!.steps[1].text;
      Object.assign(badge.style, {
        position: "absolute", left: "160px", top: "420px", padding: "24px 48px",
        fontSize: "56px", fontWeight: "700", color: "var(--k-bg)", background: "var(--k-accent)",
      });
      ctx.html.append(badge);
      tl.from(badge, { autoAlpha: 0, x: -240, duration: 0.8, ease: "power2.out" });
    },
  ],
});
