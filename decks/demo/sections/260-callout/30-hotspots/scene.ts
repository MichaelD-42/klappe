import { gsap } from "gsap";
import { callout, focus, image, type CalloutHandle, type FocusHandle, type ImageHandle } from "klappe/fx";
import { captioned } from "../../../caption";

type R = { pic: ImageHandle; marks: HTMLElement[]; x: FocusHandle; notes: CalloutHandle[] };

// The picture is 1672 x 941, shown 1280 wide: a mark's place is its picture pixel times 1280 / 1672.
const RECT = { x: 320, y: 100, w: 1280, h: 720 };
const K = RECT.w / 1672;
const SPOTS = [
  { px: 650, py: 310, text: "An idea comes in" },
  { px: 1085, py: 280, text: "The build runs" },
  { px: 1365, py: 250, text: "Value reaches users" },
];

// Numbered hotspots: marks on a picture, each explained on its step while the others dim (focus), the
// explanation a callout on the mark.
export default captioned("hotspots — numbered marks on a picture, focus(ctx, marks) and one callout per mark", {
  build(ctx): R {
    const pic = image(ctx, { href: "media/value-stream-hero.png", alt: "A hand drawing a value stream on a whiteboard", rect: RECT, fit: "cover" });
    const marks = SPOTS.map((s, i) => {
      const m = ctx.html.appendChild(document.createElement("div"));
      m.textContent = String(i + 1);
      Object.assign(m.style, {
        position: "absolute", left: `${RECT.x + s.px * K - 28}px`, top: `${RECT.y + s.py * K - 28}px`, width: "56px", height: "56px", zIndex: "5",
        boxSizing: "border-box", borderRadius: "50%", border: "3px solid var(--k-bg)", background: "var(--k-accent)", color: "var(--k-bg)",
        font: "700 30px/50px var(--k-font)", textAlign: "center",
      });
      return m;
    });
    gsap.set(marks, { autoAlpha: 0 });
    const notes = SPOTS.map((s, i) => callout(ctx, { target: marks[i], text: s.text, side: "bottom", offset: 140 }));
    return { pic, marks, x: focus(ctx, marks, { dim: 0.5 }), notes };
  },
  steps: [
    (tl, r: R) => (r.pic.show(tl), tl.to(r.marks, { autoAlpha: 1, duration: 0.4, stagger: 0.1 })),
    (tl, r: R) => (r.x.on(0)(tl), r.notes[0].show(tl)),
    (tl, r: R) => (r.notes[0].hide(tl), r.x.on(1)(tl), r.notes[1].show(tl)),
    (tl, r: R) => (r.notes[1].hide(tl), r.x.on(2)(tl), r.notes[2].show(tl)),
    (tl, r: R) => (r.notes[2].hide(tl), r.x.clear(tl)),
  ],
});
