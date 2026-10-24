import { gsap } from "gsap";
import { captioned } from "../../../caption";

const SIZE = 160;
const EASES = ["power2.inOut", "back.out(1.7)", "elastic.out(1, 0.4)"];
const LEFT = [260, 820, 1380]; // one column per ease, wide enough for the box at its full size

// Three boxes with the same moves and a different ease each: tl.to(box, { x | rotation | width, ease }).
export default captioned("tl.to(box, { y, rotation, width, ease }) — move, rotate and resize; the ease sets the feel", {
  build(ctx) {
    const labels = EASES.map((ease, i) => {
      const l = document.createElement("div");
      l.textContent = ease;
      Object.assign(l.style, { position: "absolute", left: `${LEFT[i]}px`, top: "180px", fontSize: "32px", fontWeight: "600" });
      return l;
    });
    const boxes = EASES.map((_, i) => {
      const b = document.createElement("div");
      Object.assign(b.style, {
        position: "absolute", left: `${LEFT[i]}px`, top: "260px", width: `${SIZE}px`, height: `${SIZE}px`, background: "var(--k-accent)",
      });
      return b;
    });
    ctx.html.append(...labels, ...boxes);
    gsap.set([...labels, ...boxes], { autoAlpha: 0 });
    return { labels, boxes };
  },
  steps: [
    (tl, r: { labels: HTMLElement[]; boxes: HTMLElement[] }) => {
      tl.to([...r.labels, ...r.boxes], { autoAlpha: 1, duration: 0.6 });
      r.boxes.forEach((b, i) => tl.to(b, { y: 260, duration: 1.2, ease: EASES[i] }, i ? "<" : ">"));
    },
    (tl, r: { boxes: HTMLElement[] }) => r.boxes.forEach((b, i) => tl.to(b, { rotation: 45, duration: 1.2, ease: EASES[i] }, i ? "<" : undefined)),
    (tl, r: { boxes: HTMLElement[] }) =>
      r.boxes.forEach((b, i) => tl.to(b, { width: 2 * SIZE, height: 2 * SIZE, duration: 1.2, ease: EASES[i] }, i ? "<" : undefined)),
  ],
}, "fade");
