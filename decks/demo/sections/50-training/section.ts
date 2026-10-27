import { gsap } from "gsap";
import { agenda, type AgendaHandle } from "klappe/fx";
import type { Ctx, SceneModule, SectionModule } from "klappe/types";

// A scene with build() gets no default title: this one shows in step 1.
export function title(ctx: Ctx, text: string): HTMLElement {
  const h = ctx.html.appendChild(document.createElement("h2"));
  h.textContent = text;
  gsap.set(h, { autoAlpha: 0 });
  return h;
}

// A layer for one effect inside a scene that shows several in turn: `ctx` draws into it, and fading `els`
// clears that effect before the next one takes the frame.
export function layer(ctx: Ctx): { ctx: Ctx; els: Element[] } {
  const svg = ctx.svg.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "g"));
  const html = ctx.html.appendChild(document.createElement("div"));
  Object.assign(html.style, { position: "absolute", inset: "0" });
  return { ctx: { ...ctx, svg, html }, els: [svg, html] };
}

// The vertical centre of the area under a scene title: the agendas and the exercise centre their blocks on it.
export const AXIS = 620;

// Moves an absolutely placed block (laid out, scene units) so its middle sits on AXIS.
export function centre(el: HTMLElement, scale = 1): void {
  el.style.top = `${AXIS / scale - el.offsetHeight / 2}px`;
}

// An agenda scene: the title and the time rows come from its scene.md through ctx.doc, the rows centred on AXIS.
// A scene.ts scene gets no Markdown rendering; ctx.doc keeps the Markdown the one source of the rows.
export const agendaScene: SceneModule = {
  build(ctx) {
    const part = ctx.doc!.steps.find((s) => s.part?.kind === "agenda")?.part;
    // The Markdown form has no icon: the break gets its coffee cup here.
    const rows = (part?.kind === "agenda" ? part.rows : []).map((r) => (r.title === "Break" ? { ...r, icon: "coffee" } : r));
    const h = title(ctx, ctx.doc!.title);
    const a = agenda(ctx, { rows, x: 160, y: 0, w: 1600 });
    centre(a.el);
    return { h, a };
  },
  steps: [
    (tl, r: { h: HTMLElement; a: AgendaHandle }) => {
      tl.to(r.h, { autoAlpha: 1, duration: 0.6 });
      r.a.show(tl);
    },
  ],
};

// The slide before is the meeting room; the training breaks it open.
const section: SectionModule = { transition: "shatter" };
export default section;
