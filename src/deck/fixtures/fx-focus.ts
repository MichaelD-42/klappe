import { assembleDeck } from "../assemble";
import { focus, type FocusHandle } from "klappe/fx";
import { gsap } from "gsap";
import type { SceneModule, StepAdder } from "../../types";

// Three boxes fade in; focus lights the first, moves to the second, then to the third by element, and clears.
// A second scene builds its on adders out of step order (the third before the first). A third scene asks for
// an element not in the list (the fixture's only problem).
type Build = Parameters<NonNullable<SceneModule["build"]>>[0];
function boxes(ctx: Build) {
  return [200, 800, 1400].map((x, i) => {
    const d = ctx.html.appendChild(document.createElement("div"));
    d.textContent = `Box ${i + 1}`;
    Object.assign(d.style, {
      position: "absolute", left: `${x}px`, top: "340px", width: "320px", height: "200px", boxSizing: "border-box",
      border: "3px solid var(--k-line)", borderRadius: "12px", background: "var(--k-surface)", color: "var(--k-fg)",
      font: "600 36px var(--k-font)", display: "flex", alignItems: "center", justifyContent: "center",
    });
    gsap.set(d, { autoAlpha: 0 });
    return d;
  });
}
type R = { b: HTMLElement[]; f: FocusHandle };
const show = (tl: gsap.core.Timeline, r: R) => void tl.fromTo(r.b, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, immediateRender: false });

const walk: SceneModule = {
  build: (ctx): R => {
    const b = boxes(ctx);
    return { b, f: focus(ctx, b) };
  },
  steps: [show, (tl, r: R) => r.f.on(0)(tl), (tl, r: R) => r.f.on(1)(tl), (tl, r: R) => r.f.on(r.b[2])(tl), (tl, r: R) => r.f.clear(tl)],
};

type E = R & { late: StepAdder; first: StepAdder };
const early: SceneModule = {
  build: (ctx): E => {
    const b = boxes(ctx);
    const f = focus(ctx, b);
    const late = f.on(2);
    return { b, f, late, first: f.on(0) };
  },
  steps: [show, (tl, r: E) => r.first(tl), (tl, r: E) => r.late(tl)],
};

type S = R & { stray: HTMLElement };
const stray: SceneModule = {
  build: (ctx): S => {
    const b = boxes(ctx);
    return { b, f: focus(ctx, b.slice(0, 2)), stray: b[2] };
  },
  steps: [show, (tl, r: S) => r.f.on(r.stray)(tl)],
};

const md = (title: string, n: number) => `## ${title}\n\n${Array.from({ length: n }, (_, i) => `- Step ${i + 1}.\n`).join("")}`;
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Focus\n",
      "sections/10-a/10-walk/scene.md": md("Walk", 5),
      "sections/10-a/20-early/scene.md": md("Early", 3),
      "sections/10-a/30-stray/scene.md": md("Stray", 2),
    },
    { "sections/10-a/10-walk/scene.ts": walk, "sections/10-a/20-early/scene.ts": early, "sections/10-a/30-stray/scene.ts": stray },
  );
