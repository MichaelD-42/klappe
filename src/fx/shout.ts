import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";

export interface ShoutOpts {
  question: string;
  answer: string;
  intensity: "calm" | "bold";
}
export interface ShoutHandle {
  enter: StepAdder;
  hold: StepAdder;
  fade: StepAdder;
  answer: StepAdder;
}

// Calm is board level: gentle. Bold is training: hard entry, heavy dim, vignette, slow push-in.
const LOOK = {
  calm: { dim: 0.3, vignette: 0, from: 0.92, push: 1.04, enter: motion.step * 1.5, ease: "power2.out", font: 120, hold: 2 },
  bold: { dim: 0.7, vignette: 1, from: 1.35, push: 1.12, enter: 0.22, ease: "power4.out", font: 156, hold: 2.5 },
};

function box(parent: HTMLElement, css: Partial<CSSStyleDeclaration>, text?: string): HTMLElement {
  const e = parent.appendChild(document.createElement("div"));
  Object.assign(e.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", fontStyle: "normal" }, css);
  if (text) e.textContent = text; // text, never HTML: deck text is not trusted markup
  return e;
}

// Long text gets a smaller size so it stays inside the frame.
const fit = (px: number, text: string) => `${Math.round(px * Math.min(1, 1.6 / Math.sqrt(Math.max(text.length, 1) / 20)))}px`;

export function shout(ctx: Ctx, opts: ShoutOpts): ShoutHandle {
  const k = LOOK[opts.intensity];
  const root = box(ctx.html, { zIndex: "5", pointerEvents: "none" });
  const dim = box(root, { background: "var(--k-blackout)" });
  const vignette = box(root, { background: "radial-gradient(ellipse at center, transparent 35%, var(--k-blackout) 100%)" });
  const centre: Partial<CSSStyleDeclaration> = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    boxSizing: "border-box",
    padding: "0 180px",
    fontWeight: "800",
    lineHeight: "1.1",
    textWrap: "balance",
  };
  // The scaled box is the text itself, not the full-frame row, so it stays inside the frame while it pushes in.
  const row = box(root, { ...centre, color: "var(--k-fg)", fontSize: fit(k.font, opts.question) });
  const q = row.appendChild(document.createElement("div"));
  q.textContent = opts.question;
  q.style.maxWidth = "1500px";
  const a = box(root, { ...centre, color: "var(--k-accent)", fontSize: fit(k.font * 0.7, opts.answer) }, opts.answer);
  gsap.set([dim, vignette, row, a], { autoAlpha: 0 });
  gsap.set(q, { scale: k.from });

  return {
    enter(tl) {
      tl.to(dim, { autoAlpha: k.dim, duration: k.enter });
      if (k.vignette) tl.to(vignette, { autoAlpha: k.vignette, duration: k.enter }, "<");
      tl.to(q, { scale: 1, duration: k.enter, ease: k.ease }, "<");
      tl.to(row, { autoAlpha: 1, duration: k.enter }, "<");
    },
    // The tension: the question stays and pushes in slowly while the speaker talks.
    hold: (tl) => void tl.to(q, { scale: k.push, duration: k.hold, ease: "none" }),
    fade: (tl) => void tl.to(row, { autoAlpha: 0, duration: motion.step }),
    // Release: the dim and vignette lift as the answer builds in.
    answer(tl) {
      tl.to([dim, vignette], { autoAlpha: 0, duration: motion.step });
      tl.to(a, { autoAlpha: 1, duration: motion.step }, "<");
    },
  };
}
