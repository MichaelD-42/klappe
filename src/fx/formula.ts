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
// Terms are in document order; a \step inside another shows with the outer one.
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
      katex.render(opts.tex, box, {
        displayMode: true,
        throwOnError: true,
        macros: { "\\step": `\\htmlClass{${TERM}}{#1}` },
        // Only the class \step sets: a deck's TeX cannot add links, ids or styles.
        trust: (t) => t.command === "\\htmlClass" && t.class === TERM,
        strict: "ignore", // LaTeX compatibility warnings, not errors: KaTeX renders those as written
      });
      terms = [...box.querySelectorAll<HTMLElement>(`.katex-html .${TERM}`)].filter((e) => !e.parentElement!.closest(`.${TERM}`));
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
  };
}
