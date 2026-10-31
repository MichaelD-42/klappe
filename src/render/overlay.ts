import { safeRect, stage as size } from "../theme";
import type { Ctx, Deck, StepAddr } from "../types";

const SVG = "http://www.w3.org/2000/svg";

// The deck's overlay.ts: a stage-size layer over the canvases and under klappe's UI, which the camera does not move.
// Built once; update sets it from the step the deck lands on, so it is a function of the step and a jump shows what
// a play does. undefined without an overlay.ts, or when its build fails (a deck problem).
export function mountOverlay(
  stage: HTMLElement,
  deck: Deck,
  opts: { total: number; problem: (msg: string) => void; reducedMotion: boolean },
): ((a: StepAddr) => void) | undefined {
  const mod = deck.overlay;
  if (!mod) return undefined;
  const problem = (msg: string) => opts.problem(`overlay.ts: ${msg}`);
  const layer = document.createElement("div");
  layer.className = "k-deck-overlay";
  const svg = layer.appendChild(document.createElementNS(SVG, "svg"));
  svg.setAttribute("viewBox", `0 0 ${size.w} ${size.h}`);
  const g = svg.appendChild(document.createElementNS(SVG, "g"));
  const html = layer.appendChild(document.createElement("div"));
  stage.insertBefore(layer, stage.querySelector(":scope > .k-ui"));
  const still = () => problem("the camera does not move the overlay");
  const ctx: Ctx = {
    rect: { x: 0, y: 0, ...size },
    safe: safeRect(deck.meta.safeArea, { x: 0, y: 0, ...size }),
    svg: g,
    html,
    canvas: { refs: {}, rects: {} },
    camera: { to: still, follow: still },
    files: deck.files ?? { data: {}, media: {} },
    onStep: () => problem("onStep is for scenes; set the overlay in update"),
    problem,
    reducedMotion: opts.reducedMotion,
    deck: { lang: deck.meta.lang, intensity: deck.meta.intensity, sources: [] },
  };
  const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
  let refs: unknown;
  try {
    refs = mod.build(ctx);
  } catch (e) {
    problem(`build failed: ${message(e)}`);
    layer.remove();
    return undefined;
  }
  const sections = new Map(deck.sections.map((s) => [s.id, s]));
  return (a) => {
    const section = sections.get(a.section);
    const at = {
      index: a.index,
      total: opts.total,
      section: a.section,
      scene: a.scene,
      step: a.step,
      sectionTitle: section?.title ?? "",
      sceneTitle: section?.scenes.find((c) => c.id === a.scene)?.title ?? "",
    };
    try {
      mod.update?.(at, refs);
    } catch (e) {
      problem(`update failed at ${a.section}/${a.scene}/${a.step}: ${message(e)}`);
    }
  };
}
