import { gsap } from "gsap";
import { cue } from "klappe/fx";
import type { Ctx, SceneModule, StepAdder } from "klappe/types";

// One step per sound: the line takes the stage, replacing the one before, and its sound plays, named by the word before
// the colon.
const scene: SceneModule = {
  build(ctx: Ctx) {
    const h = ctx.html.appendChild(document.createElement("h2"));
    h.textContent = ctx.doc!.title;
    const lines = ctx.doc!.steps.map((s) => {
      const p = ctx.html.appendChild(document.createElement("p"));
      p.className = "k-say";
      const [name, rest] = s.text.split(": ");
      p.innerHTML = `<b style="color: var(--k-accent)"></b>`;
      p.firstElementChild!.textContent = name;
      p.append(`: ${rest}`);
      return { p, sound: cue(ctx, { href: name }) };
    });
    gsap.set([h, ...lines.map((l) => l.p)], { autoAlpha: 0 });
    return { h, lines };
  },
  steps: Array.from({ length: 10 }, (_, i) => (tl: gsap.core.Timeline, r: { h: HTMLElement; lines: { p: HTMLElement; sound: StepAdder }[] }) => {
    if (i === 0) tl.to(r.h, { autoAlpha: 1, duration: 0.3 });
    tl.to(r.lines[i].p, { autoAlpha: 1, duration: 0.3 }, i === 0 ? "<" : undefined);
    if (i > 0) tl.to(r.lines[i - 1].p, { autoAlpha: 0, duration: 0.3 }, "<");
    r.lines[i].sound(tl);
  }),
};
export default scene;
