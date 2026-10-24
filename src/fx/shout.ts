import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";

export interface ShoutOpts {
  question: string;
  answer: string;
  intensity?: "calm" | "bold"; // default: the deck's (deck.md `intensity`)
}
export interface ShoutHandle {
  enter: StepAdder;
  fade: StepAdder;
  answer: StepAdder;
}

// Calm is board level: gentle. Bold is training: hard entry, heavy dim, vignette. The question grows to its
// full push-in on the enter step, so one click shows it at full size.
// trace: how much of the question stays after the fade (bold keeps a trace so the beat is not a blank slide).
const LOOK = {
  calm: { dim: 0.3, vignette: 0, from: 0.92, push: 1.04, enter: motion.step * 1.5, ease: "power2.out", font: 120, trace: 0, fade: motion.step },
  bold: { dim: 0.7, vignette: 1, from: 1.35, push: 1.12, enter: 0.22, ease: "power4.out", font: 156, trace: 0.12, fade: 0.3 },
};

function box(parent: HTMLElement, css: Partial<CSSStyleDeclaration>, role: string, text?: string): HTMLElement {
  const e = parent.appendChild(document.createElement("div"));
  Object.assign(e.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", fontStyle: "normal" }, css);
  e.dataset.kShout = role; // a hook for tests
  if (text) e.textContent = text; // text, never HTML: deck text is not trusted markup
  return e;
}

// Long text gets a smaller size so it stays inside the frame.
const fit = (px: number, text: string) => `${Math.round(px * Math.min(1, 1.6 / Math.sqrt(Math.max(text.length, 1) / 20)))}px`;

// The answers of the shouts already built in a scene: the next shout's enter clears them.
const answers = new WeakMap<HTMLElement, HTMLElement[]>();

export function shout(ctx: Ctx, opts: ShoutOpts): ShoutHandle {
  const intensity = opts.intensity ?? ctx.deck.intensity;
  const k = LOOK[intensity];
  const bold = intensity === "bold";
  const root = box(ctx.html, { zIndex: "5", pointerEvents: "none" }, "root");
  const dim = box(root, { background: "var(--k-blackout)" }, "dim");
  const vignette = box(root, { background: "radial-gradient(ellipse at center, transparent 35%, var(--k-blackout) 100%)" }, "vignette");
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
  // The scaled boxes are the text itself, not the full-frame rows, so they stay inside the frame.
  const inner = (row: HTMLElement, text: string) => {
    const e = row.appendChild(document.createElement("div"));
    e.textContent = text;
    e.style.maxWidth = "1500px";
    return e;
  };
  const row = box(root, { ...centre, color: "var(--k-fg)", fontSize: fit(k.font, opts.question) }, "question");
  const q = inner(row, opts.question);
  const a = box(root, { ...centre, color: "var(--k-accent)", fontSize: fit(k.font * 0.7, opts.answer) }, "answer");
  const at = inner(a, opts.answer);
  const earlier = answers.get(ctx.html) ?? [];
  answers.set(ctx.html, [...earlier, a]);
  gsap.set([dim, vignette, row, a], { autoAlpha: 0 });
  gsap.set(q, { scale: k.from });
  if (bold) gsap.set(at, { scale: 0.8 });

  return {
    enter(tl) {
      if (earlier.length) tl.to(earlier, { autoAlpha: 0, duration: k.enter }); // an earlier shout's answer leaves
      tl.to(dim, { autoAlpha: k.dim, duration: k.enter }, earlier.length ? "<" : undefined);
      if (k.vignette) tl.to(vignette, { autoAlpha: k.vignette, duration: k.enter }, "<");
      tl.to(q, { scale: k.push, duration: k.enter, ease: k.ease }, "<");
      tl.to(row, { autoAlpha: 1, duration: k.enter }, "<");
    },
    fade: (tl) => void tl.to(row, { autoAlpha: k.trace, duration: k.fade }),
    // Release: the dim, vignette and any trace lift as the answer builds in. Bold pops the answer.
    answer(tl) {
      tl.to([dim, vignette, row], { autoAlpha: 0, duration: motion.step });
      tl.to(a, { autoAlpha: 1, duration: motion.step }, "<");
      if (bold) tl.to(at, { scale: 1, duration: motion.step, ease: "back.out(2.5)" }, "<");
    },
  };
}
