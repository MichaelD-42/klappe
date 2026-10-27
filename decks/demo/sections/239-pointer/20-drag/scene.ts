import { gsap } from "gsap";
import { pointer, type PointerHandle } from "klappe/fx";
import { captioned } from "../../../caption";

type R = { p: PointerHandle; cols: HTMLElement[]; card: HTMLElement; slot: HTMLElement };

// Two columns of a board; the card starts in the first, the slot it lands on sits in the second.
export default captioned("pointer — drag(item, to): grab, carry, let go", {
  build(ctx): R {
    const div = (css: Partial<CSSStyleDeclaration>, text = "") => {
      const e = ctx.html.appendChild(document.createElement("div"));
      Object.assign(e.style, { position: "absolute", boxSizing: "border-box", ...css });
      e.textContent = text;
      return e;
    };
    const col = (left: number, name: string) =>
      div({ left: `${left}px`, top: "160px", width: "560px", height: "700px", border: "2px solid var(--k-line)", borderRadius: "12px", padding: "20px 28px", font: "700 32px/1.2 var(--k-font)", color: "var(--k-fg)" }, name);
    const cols = [col(300, "To do"), col(1060, "Doing")];
    const slot = div({ left: "1100px", top: "260px", width: "480px", height: "120px" });
    const card = div({
      left: "340px", top: "260px", width: "480px", height: "120px", display: "flex", alignItems: "center", padding: "0 24px", zIndex: "3",
      background: "var(--k-surface)", border: "2px solid var(--k-accent)", borderRadius: "10px", font: "600 30px/1.2 var(--k-font)", color: "var(--k-fg)",
    }, "Fix the retry bug");
    gsap.set([...cols, card], { autoAlpha: 0 });
    return { p: pointer(ctx, { at: { x: 1500, y: 900 } }), cols, card, slot };
  },
  steps: [
    (tl, r: R) => (tl.to([...r.cols, r.card], { autoAlpha: 1, duration: 0.6 }), r.p.show(tl)),
    (tl, r: R) => r.p.drag(r.card, r.slot)(tl),
  ],
});
