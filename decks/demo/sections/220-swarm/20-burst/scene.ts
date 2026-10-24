import { gsap } from "gsap";
import { burst, type BurstHandle } from "klappe/fx";
import { captioned } from "../../../caption";

const AT = { x: 960, y: 470 }; // the number's centre; the default radius 360 keeps the pieces above the caption strip

// The milestone fades in and the burst pops from it in the same step, so reduced motion still shows the number.
export default captioned("burst() — seeded confetti pops once from a point: pop", {
  build(ctx) {
    const b = burst(ctx, { at: AT, seed: 7 }); // first, so the number paints above the canvas
    const box = document.createElement("div");
    Object.assign(box.style, { position: "absolute", left: `${AT.x - 500}px`, top: `${AT.y - 110}px`, width: "1000px", textAlign: "center" });
    const big = box.appendChild(document.createElement("div"));
    big.textContent = "1,000";
    Object.assign(big.style, { fontSize: "160px", fontWeight: "700", lineHeight: "1", color: "var(--k-accent)" });
    const sub = box.appendChild(document.createElement("div"));
    sub.textContent = "customers";
    Object.assign(sub.style, { fontSize: "48px" });
    ctx.html.append(box);
    gsap.set(box, { autoAlpha: 0, scale: 0.8 });
    return { b, box };
  },
  steps: [
    (tl, { b, box }: { b: BurstHandle; box: HTMLElement }) => {
      tl.to(box, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2)" });
      b.pop(tl, "<");
    },
  ],
});
