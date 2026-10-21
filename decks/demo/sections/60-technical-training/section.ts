import { gsap } from "gsap";
import { agenda, type AgendaHandle } from "klappe/fx";
import type { Ctx, SceneModule, SectionModule } from "klappe/types";
import retryMd from "./20-retry/scene.md?raw";

// The retry function as the walkthrough shows it: the bug and fix scenes take it from there, so it is written once.
export const RETRY = /```js[^\n]*\n([\s\S]*?)\n```/.exec(retryMd)![1];
export const BUG_LINE = RETRY.split("\n").findIndex((l) => l.includes("i <= attempts")) + 1;
export const FIXED = RETRY.replace("i <= attempts", "i < attempts");
// Where the Markdown walkthrough puts its code (src/render/world.ts), so the code stays put from scene to scene.
export const SLOT = { x: 960, y: 140, w: 806, h: 799 };

// A scene with build() gets no default title: this one shows in step 1.
export function title(ctx: Ctx, text: string): HTMLElement {
  const h = ctx.html.appendChild(document.createElement("h2"));
  h.textContent = text;
  gsap.set(h, { autoAlpha: 0 });
  return h;
}

// The vertical centre of the area under a scene title: the agendas and the exercise centre their blocks on it.
export const AXIS = 620;

// Moves an absolutely placed block (laid out, scene units) so its middle sits on AXIS.
export function centre(el: HTMLElement, scale = 1): void {
  el.style.top = `${AXIS / scale - el.offsetHeight / 2}px`;
}

const ROW = /^- (\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})\s+(.+?)\s*(←)?$/gm;

// An agenda scene from its scene.md: the title and the time rows are read from there, the rows centred on AXIS.
// A scene.ts scene gets no Markdown rendering; this keeps the Markdown the one source of the rows.
export function agendaScene(md: string): SceneModule {
  const rows = [...md.matchAll(ROW)].map(([, from, to, t, cur]) => ({ from, to, title: t, current: !!cur }));
  return {
    build(ctx) {
      const h = title(ctx, /^## (.+)$/m.exec(md)![1]);
      const a = agenda(ctx, { rows, x: 160, y: 0, w: 1600 });
      centre(ctx.html.lastElementChild as HTMLElement); // agenda() appends its block last
      return { h, a };
    },
    steps: [
      (tl, r: { h: HTMLElement; a: AgendaHandle }) => {
        tl.to(r.h, { autoAlpha: 1, duration: 0.6 });
        r.a.show(tl);
      },
    ],
  };
}

// The slide before is the numbers deck's video; the training breaks it open.
const section: SectionModule = { transition: "shatter" };
export default section;
