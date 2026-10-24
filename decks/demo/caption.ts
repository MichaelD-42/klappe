import { gsap } from "gsap";
import type { Ctx, SceneModule, StepFn } from "klappe/types";

// The gallery caption: what the effect is and which call makes it, in a strip under the effect
// (scene-local y 960 and below, so effects keep the frame above it). Every gallery caption comes from here.
// It lives outside sections/, so the loader does not take it for a scene or section module.
const caps = new WeakMap<HTMLElement, HTMLElement>();
// transition: name it on the first scene of a section whose entry the viewer sees (not the first section).
function caption(ctx: Ctx, text: string, transition?: string): HTMLElement {
  const box = document.createElement("div");
  // z-index 6: above shout's layer (z-index 5), so the caption stays readable while its dim is up.
  Object.assign(box.style, { position: "absolute", left: "160px", top: "960px", width: "1600px", zIndex: "6" });
  const main = box.appendChild(document.createElement("div"));
  main.textContent = text;
  Object.assign(main.style, { fontSize: "36px", fontWeight: "600", color: "var(--k-accent)" });
  if (transition) {
    const sub = box.appendChild(document.createElement("div"));
    sub.textContent = `This section enters with section.ts { transition: "${transition}" }`;
    Object.assign(sub.style, { fontSize: "26px", color: "var(--k-fg)", opacity: "0.75" });
  }
  ctx.html.append(box);
  gsap.set(box, { autoAlpha: 0 });
  caps.set(ctx.html, box);
  return box;
}
// The scene's caption, for steps that hide it during a camera move.
export const captionOf = (ctx: Ctx) => caps.get(ctx.html)!;

// A scene with its caption: built after the effect (so it paints on top of it), shown in step 1.
export function captioned(text: string, scene: SceneModule, transition?: string): SceneModule {
  const [first, ...rest] = scene.steps ?? [];
  const step1: StepFn = (tl, r, ctx) => {
    const at = tl.duration(); // where the effect's own first tween starts
    first?.(tl, r, ctx);
    tl.to(captionOf(ctx), { autoAlpha: 1, duration: 0.6 }, at);
  };
  return {
    ...scene,
    build(ctx) {
      const refs = scene.build?.(ctx);
      caption(ctx, text, transition);
      return refs;
    },
    steps: [step1, ...rest],
  };
}
