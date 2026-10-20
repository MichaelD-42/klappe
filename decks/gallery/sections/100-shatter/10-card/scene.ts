import { gsap } from "gsap";
import { shatter, type ShatterHandle } from "klappe/fx";
import { captioned } from "../../10-chart/section";

// A card, shown in step 1, then cracked, cracked to the edges and shattered. It ends above the caption strip.
export default captioned("shatter() — the card cracks, cracks to the edges, then falls apart: crack, crack2, fall", {
  build(ctx) {
    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "absolute",
      inset: "60px 60px 160px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(140deg, color-mix(in srgb, var(--k-accent) 30%, var(--k-bg)), var(--k-bg))",
    });
    const h = document.createElement("h2");
    h.textContent = "The old way";
    el.append(h);
    ctx.html.append(el);
    const fx = shatter(ctx, { target: el });
    gsap.set(el, { autoAlpha: 0 });
    return { el, fx };
  },
  steps: [
    (tl, { el }: { el: HTMLElement }) => void tl.to(el, { autoAlpha: 1, duration: 0.6 }),
    (tl, { fx }: { fx: ShatterHandle }) => fx.crack(tl),
    (tl, { fx }: { fx: ShatterHandle }) => fx.crack2(tl),
    (tl, { fx }: { fx: ShatterHandle }) => fx.fall(tl),
  ],
}, "shatter");
