import { gsap } from "gsap";
import type { CanvasRuntime } from "../render/world";
import type { TransitionOpts } from "./transitions";
import { stage } from "../theme";

const CUBE = 1;
const PAGE = 0.9;
const REVEAL = 0.6; // share of the turn after which the new section's first step starts
// The canvases have no background of their own: during a turn each is a sheet in the stage colour. The world
// spreads past the frame (the scenes the camera is not on), and the sheet hides it: the stage clips only its own box.
const SHEET = { backgroundColor: "var(--k-bg)", backfaceVisibility: "hidden", overflow: "hidden" };
const CLEAR = "transform,transformOrigin,backgroundColor,backfaceVisibility,overflow,filter";

// The old canvas turns away to the left as one face of a cube; the new one turns in as the next face.
// Both turn about the cube's centre, 960 px behind the screen, so their edges meet. The stage colour shows around the cube.
export function transitionCube(from: CanvasRuntime, to: CanvasRuntime, _opts: TransitionOpts): gsap.core.Timeline {
  const worlds = from.el.parentElement!;
  const stage = worlds.parentElement!;
  const face = { ...SHEET, transformOrigin: "50% 50% -960px" };
  return gsap
    .timeline()
    .set(stage, { backgroundColor: "var(--k-bg)" })
    .set(worlds, { perspective: 2400 })
    .set(from.el, face)
    .set(to.el, { ...face, autoAlpha: 1 })
    .fromTo(from.el, { rotationY: 0, filter: "brightness(1)" }, { rotationY: -90, filter: "brightness(0.4)", duration: CUBE, ease: "power2.inOut", immediateRender: false }, 0)
    .fromTo(to.el, { rotationY: 90, filter: "brightness(0.4)" }, { rotationY: 0, filter: "brightness(1)", duration: CUBE, ease: "power2.inOut", immediateRender: false }, 0)
    .addLabel("reveal", CUBE * REVEAL)
    .set(from.el, { autoAlpha: 0, clearProps: CLEAR }, CUBE)
    .set(to.el, { clearProps: CLEAR }, CUBE)
    .set(worlds, { clearProps: "perspective" }, CUBE)
    .set(stage, { clearProps: "backgroundColor" }, CUBE);
}

type Pt = [number, number];
// The stage's size and diagonal, and U: the page folds across this direction, from the bottom-right corner to the top-left.
function sheet() {
  const { w: W, h: H } = stage;
  const DIAG = Math.hypot(W, H);
  const U: Pt = [W / DIAG, H / DIAG];
  return { W, H, DIAG, U, along: (p: Pt) => p[0] * U[0] + p[1] * U[1] };
}

// The part of polygon P where along(p) - s has the sign `side` (Sutherland-Hodgman, one edge).
function cut(P: Pt[], s: number, side: 1 | -1, along: (p: Pt) => number): Pt[] {
  const out: Pt[] = [];
  P.forEach((a, i) => {
    const b = P[(i + 1) % P.length];
    const [da, db] = [(along(a) - s) * side, (along(b) - s) * side];
    if (da <= 0) out.push(a);
    if (da < 0 !== db < 0 && da !== db) out.push([a[0] + ((b[0] - a[0]) * da) / (da - db), a[1] + ((b[1] - a[1]) * da) / (da - db)]);
  });
  return out;
}

// The peel at progress p (0 to 1): `page`, what still lies flat, and `flap`, the peeled part folded back over it
// (the peeled corner mirrored across the fold line). The fold runs from the bottom-right corner to the top-left one.
export function pagePeel(p: number): { page: Pt[]; flap: Pt[] } {
  const { W, H, DIAG, U, along } = sheet();
  const s = DIAG * (1 - p);
  const rect: Pt[] = [[0, 0], [W, 0], [W, H], [0, H]];
  const peeled = cut(rect, s, -1, along);
  return { page: cut(rect, s, 1, along), flap: peeled.map((q) => { const d = 2 * (along(q) - s); return [q[0] - d * U[0], q[1] - d * U[1]]; }) };
}

// The gradient line of a box-sized gradient at this angle runs along U, and a stop at n px sits where along() = n.
const shadeAngle = (W: number, H: number) => 180 - (Math.atan2(W, H) * 180) / Math.PI;
const poly = (P: Pt[]) => (P.length ? `polygon(${P.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(", ")})` : "inset(50%)");

// The old canvas peels off like a page from its bottom-right corner; the back of the page (the surface colour,
// a shade at the crease and darker toward the corner) folds over it, and the new canvas comes out of its shadow.
export function transitionPageTurn(from: CanvasRuntime, to: CanvasRuntime, _opts: TransitionOpts): gsap.core.Timeline {
  const { W, H, DIAG } = sheet();
  const worlds = from.el.parentElement!;
  let flap = worlds.querySelector<HTMLElement>(":scope > [data-k-peel]");
  if (!flap) {
    flap = worlds.appendChild(document.createElement("div"));
    flap.dataset.kPeel = "";
    Object.assign(flap.style, { position: "absolute", left: "0", top: "0", width: `${W}px`, height: `${H}px`, zIndex: "2" });
  }
  const f = flap;
  gsap.set(f, { autoAlpha: 0 });
  const draw = (p: number) => {
    const g = pagePeel(p);
    from.el.style.clipPath = p >= 1 ? "" : poly(g.page);
    f.style.clipPath = poly(g.flap);
    // The shade moves with the fold (along = s); the folded corner lands at along = 2s - DIAG.
    const s = DIAG * (1 - p);
    const mix = (k: number) => `color-mix(in srgb, var(--k-surface) ${k}%, var(--k-blackout))`;
    f.style.background = `linear-gradient(${shadeAngle(W, H)}deg, ${mix(72)} ${2 * s - DIAG}px, var(--k-surface) ${s - 60}px, ${mix(85)} ${s}px)`;
  };
  return gsap
    .timeline()
    // The new canvas may come later in the DOM: the page stays on top.
    .set(from.el, { zIndex: 1 })
    .set(to.el, { autoAlpha: 1, backgroundColor: "var(--k-bg)" }) // a sheet, so the shadow shows on it
    .set(f, { autoAlpha: 1 })
    .to({}, { duration: PAGE, ease: "power1.inOut", onUpdate: function (this: gsap.core.Tween) { draw(this.ratio); } }, 0)
    .fromTo(to.el, { filter: "brightness(0.5)" }, { filter: "brightness(1)", duration: PAGE, ease: "power1.in", immediateRender: false }, 0)
    .addLabel("reveal", PAGE * REVEAL)
    .set(from.el, { autoAlpha: 0, clearProps: "zIndex,clipPath" }, PAGE)
    .set(f, { autoAlpha: 0, clearProps: "clipPath,background" }, PAGE)
    .set(to.el, { clearProps: "filter,backgroundColor" }, PAGE);
}
