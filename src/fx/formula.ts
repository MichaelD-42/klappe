import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";

export interface FormulaOpts {
  tex: string; // TeX; wrap each term that builds on its own step in \step{…}
  x: number;
  y: number;
  w: number;
  h: number;
  size?: number; // the font size, scene px; default 64, shrunk to fit w and h
}
export interface FormulaHandle {
  show: StepAdder; // the formula without its \step terms
  next(): StepAdder; // the next \step term, in reading order
  light(i: number | null): StepAdder; // a shown \step term turns --k-accent, the one lit before goes back; null: none
}

const FLOOR = 30; // scene px: sub- and superscripts, at 70 %, stay at the 20 px legibility floor
const TERM = "k-ft";

type Katex = typeof import("katex").default;
let katex: Katex | undefined;

// KaTeX and its stylesheet (with its fonts, bundled) load here, once, before the world renders, only for a deck
// whose code imports formula: main.ts awaits it through loadParts. A failed load leaves formula showing raw TeX.
export async function loadKatex(): Promise<void> {
  if (katex) return;
  try {
    const [m] = await Promise.all([import("katex"), import("katex/dist/katex.min.css")]);
    katex = m.default;
  } catch (e) {
    console.error("formula: KaTeX failed to load; formulas show as TeX", e);
  }
}

// A typeset equation that builds term by term: show sets the rest, each next() fades the next \step{…} term in.
// Terms are in source order; a \step inside another shows with the outer one.
export function formula(ctx: Ctx, opts: FormulaOpts): FormulaHandle {
  const box = ctx.html.appendChild(document.createElement("div"));
  Object.assign(box.style, {
    position: "absolute", left: `${opts.x}px`, top: `${opts.y}px`, width: `${opts.w}px`, height: `${opts.h}px`,
    display: "flex", alignItems: "center", justifyContent: "center", color: "var(--k-fg)", fontSize: `${opts.size ?? 64}px`,
  });
  box.dataset.kFormula = "";
  let terms: HTMLElement[] = [];
  if (!katex) {
    ctx.problem("formula: KaTeX is not loaded; is formula imported from klappe/fx in this scene?");
    box.textContent = opts.tex;
  } else
    try {
      // Each \step carries its place in the source, so terms build in the order they are written: KaTeX puts a
      // fraction's denominator before its numerator in the DOM.
      let n = 0;
      const tex = opts.tex.replace(/\\step(?![a-zA-Z])/g, () => `\\kft{${n++}}`);
      katex.render(tex, box, {
        displayMode: true,
        throwOnError: true,
        macros: { "\\kft": `\\htmlClass{${TERM} ${TERM}-#1}{#2}` },
        // Only the classes \step sets: a deck's TeX cannot add links, ids or styles.
        trust: (t) => t.command === "\\htmlClass" && new RegExp(`^${TERM} ${TERM}-\\d+$`).test(t.class),
        strict: "ignore", // LaTeX compatibility warnings, not errors: KaTeX renders those as written
      });
      const place = (e: Element) => Number([...e.classList].find((c) => c.startsWith(`${TERM}-`))!.slice(TERM.length + 1));
      terms = [...box.querySelectorAll<HTMLElement>(`.katex-html .${TERM}`)].filter((e) => !e.parentElement!.closest(`.${TERM}`)).sort((a, b) => place(a) - place(b));
    } catch (e) {
      ctx.problem(`formula: ${e instanceof Error ? e.message : String(e)}`);
      box.textContent = opts.tex;
      box.style.color = "var(--k-warn)";
    }
  gsap.set([box, ...terms], { autoAlpha: 0 });

  // Shrunk to fit on first use: the layout exists by then, not while building.
  let fitted = false;
  const fit = () => {
    if (fitted) return;
    fitted = true;
    const over = () => box.scrollWidth > box.clientWidth + 1 || box.scrollHeight > box.clientHeight + 1;
    let size = opts.size ?? 64;
    for (; size > FLOOR && over(); size -= 2) box.style.fontSize = `${size - 2}px`;
    if (over()) ctx.problem(`formula: does not fit ${opts.w} x ${opts.h} at ${FLOOR}px; split it or widen the rect`);
  };

  let shown = 0; // terms the next() steps added so far showed
  let lit: HTMLElement | undefined; // the term the light() steps added so far leave lit
  return {
    show(tl) {
      fit();
      tl.to(box, { autoAlpha: 1, duration: motion.step });
    },
    // The term is picked when the step is added, not here: adders made out of step order still build in order.
    next: () => (tl) => {
      const term = terms[shown++];
      if (!term) {
        ctx.problem(`formula: next() past the last \\step term (${terms.length} terms)`);
        return void tl.set({}, {}, tl.duration() + 0.4); // the step still takes a beat
      }
      tl.fromTo(term, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step, immediateRender: false });
    },
    light: (i) => (tl) => {
      const t = tl.duration();
      tl.set({}, {}, t + motion.step); // sets only: the step still takes a beat
      if (i !== null && !(i >= 0 && i < shown)) return ctx.problem(`formula: light(${i}) before \step term ${i} shows (${shown} shown)`);
      const term = i === null ? undefined : terms[i];
      if (lit && lit !== term) tl.set(lit, { color: "var(--k-fg)", immediateRender: false }, t);
      if (term) tl.set(term, { color: "var(--k-accent)", immediateRender: false }, t);
      lit = term;
    },
  };
}
