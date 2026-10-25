import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";

export interface FlipCardOpts {
  x: number; // top-left corner, scene-local
  y: number;
  w?: number; // default 640
  h?: number; // default 400
  front: string; // a question, a myth
  back: string; // the answer, the fact
}
export interface FlipCardHandle {
  show: StepAdder;
  flip: StepAdder; // turns the card to its other side: front, back, front, …
}

// A card with two sides that turns over on its vertical axis. The back faces away (rotateY 180) and each face
// hides its back side, so the card's angle alone picks the side that shows. With reduced motion the faces
// crossfade in place instead, with no rotation and so no hidden backfaces.
export function flipCard(ctx: Ctx, opts: FlipCardOpts): FlipCardHandle {
  const [w, h] = [opts.w ?? 640, opts.h ?? 400];
  const turn = !ctx.reducedMotion;
  const root = ctx.html.appendChild(document.createElement("div"));
  root.setAttribute("data-k-flipcard", "");
  Object.assign(root.style, { position: "absolute", left: `${opts.x}px`, top: `${opts.y}px`, width: `${w}px`, height: `${h}px`, perspective: `${w * 3}px` });
  const card = root.appendChild(document.createElement("div"));
  Object.assign(card.style, { position: "absolute", inset: "0", transformStyle: "preserve-3d" });
  const face = (side: "front" | "back", text: string, border: string) => {
    const f = card.appendChild(document.createElement("div"));
    f.setAttribute(`data-k-flipcard-${side}`, "");
    f.textContent = text;
    Object.assign(f.style, {
      position: "absolute", inset: "0", boxSizing: "border-box", padding: "32px 40px", borderRadius: "16px", background: "var(--k-surface)",
      border, color: "var(--k-fg)", font: "600 40px/1.25 var(--k-font)", display: "flex", alignItems: "center", justifyContent: "center",
      textAlign: "center", backfaceVisibility: "hidden",
    });
    return f;
  };
  const front = face("front", opts.front, "2px solid var(--k-line)");
  const back = face("back", opts.back, "4px solid var(--k-accent)"); // the new side is named in the accent
  gsap.set(root, { autoAlpha: 0 });
  if (turn) {
    gsap.set(back, { rotationY: 180 });
    gsap.set(card, { rotationY: 0 });
  } else {
    gsap.set(front, { autoAlpha: 1 }); // written at load, as a seek back to the front writes it
    gsap.set(back, { autoAlpha: 0 });
  }

  let flips = 0; // flips added so far: odd shows the back
  return {
    show(tl) {
      tl.to(root, { autoAlpha: 1, duration: motion.step });
    },
    flip(tl) {
      // immediateRender off: a later step's start values must not apply at load.
      if (turn) tl.fromTo(card, { rotationY: flips * 180 }, { rotationY: (flips + 1) * 180, duration: motion.step * 1.5, ease: "power2.inOut", immediateRender: false });
      else {
        const [from, to] = flips % 2 ? [back, front] : [front, back];
        tl.fromTo(from, { autoAlpha: 1 }, { autoAlpha: 0, duration: motion.step, immediateRender: false });
        tl.fromTo(to, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step, immediateRender: false }, "<");
      }
      flips++;
    },
  };
}
