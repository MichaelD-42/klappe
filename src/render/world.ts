import { gsap } from "gsap";
import { addCameraMove, frame } from "../camera";
import { motion } from "../theme";
import type { CanvasLayout, Ctx, Deck, Rect, Scene } from "../types";

export interface CanvasRuntime {
  layout: CanvasLayout;
  el: HTMLElement;
  tl: gsap.core.Timeline;
  refs: Record<string, any>;
}

const SVG = "http://www.w3.org/2000/svg";

// A module error must not stop the rest of the deck; it is logged and so lands in klappe.errors.
function safe<T>(where: string, fn: () => T): T | undefined {
  try {
    return fn();
  } catch (e) {
    console.error(`${where}: ${e instanceof Error ? e.message : e}`);
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// Default renderer: the title and one p[data-step=n] per visible step, all hidden.
function renderDefault(scene: Scene, html: HTMLElement): HTMLElement {
  const title = el("h2", "", scene.title);
  html.append(title);
  scene.steps.forEach((s, i) => {
    if (s.kind === "shout-hold" || s.kind === "shout-fade") return;
    const p = el("p", s.kind === "shout-enter" ? "k-shout" : "", s.text);
    p.dataset.step = String(i + 1);
    html.append(p);
  });
  gsap.set(html.children, { autoAlpha: 0 });
  return title;
}

function defaultStep(tl: gsap.core.Timeline, scene: Scene, n: number, html: HTMLElement) {
  const at = (k: number) => html.querySelector<HTMLElement>(`[data-step="${k}"]`);
  const kind = scene.steps[n - 1].kind;
  // M1 shout-out: question appears, holds, fades, then the answer appears. M2 adds the full effect.
  if (kind === "shout-hold") tl.to({}, { duration: motion.step });
  else if (kind === "shout-fade") {
    const q = at(n - 2);
    if (q) tl.to(q, { autoAlpha: 0, duration: motion.step });
  } else {
    const p = at(n);
    if (p) tl.to(p, { autoAlpha: 1, duration: motion.step });
  }
}

// A step always takes time on both sides of its content, so a zero-duration tween (or none)
// never lands on a label and leaks into the previous step on seek or play.
const PAD = 0.001;
export function appendStep(tl: gsap.core.Timeline, label: string, add: (tl: gsap.core.Timeline) => void): void {
  tl.to({}, { duration: PAD });
  add(tl);
  tl.to({}, { duration: PAD });
  tl.addLabel(label);
}

export function renderWorld(
  deck: Deck,
  canvases: CanvasLayout[],
  root: HTMLElement,
  opts: { reducedMotion?: boolean } = {},
): CanvasRuntime[] {
  // Pass 1: all DOM and hidden initial state, before any timeline exists, so seek(0) = hidden.
  const perScene = new Map<Scene, { ctx: Ctx; refs: any; title?: HTMLElement }>();
  const runtimes = canvases.map((layout) => {
    const { w, h } = layout.size;
    const world = el("div", "k-world");
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("class", "k-layer");
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const html = el("div", "k-layer");
    for (const e of [world, html]) Object.assign(e.style, { width: `${w}px`, height: `${h}px` });
    world.append(svg, html);
    root.append(world);

    const tl = gsap.timeline({ paused: true });
    const refs: Record<string, any> = {};
    const sections = deck.sections.filter((s) => layout.sectionIds.includes(s.id));
    const first: Rect = layout.rects[sections.flatMap((s) => s.scenes)[0]?.id] ?? { x: 0, y: 0, w: 1920, h: 1080 };
    let cam = first;
    const camera: Ctx["camera"] = {
      to(t, target, o) {
        if (["x", "y", "w", "h"].every((k) => cam[k as keyof Rect] === target[k as keyof Rect])) return; // already there
        // Reduced motion: camera flights become cuts (spec §7); the step padding keeps them off the labels.
        addCameraMove(t, world, cam, target, { ...o, instant: opts.reducedMotion });
        cam = target;
      },
    };
    const ctxAt = (rect: Rect, attr: string, id: string, cls: string): Ctx => {
      const g = document.createElementNS(SVG, "g");
      g.setAttribute(attr, id);
      g.setAttribute("transform", `translate(${rect.x} ${rect.y})`);
      svg.append(g);
      const d = el("div", cls);
      d.setAttribute(attr, id);
      Object.assign(d.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` });
      html.append(d);
      return { rect, svg: g, html: d, canvas: { refs, rects: layout.rects }, camera };
    };

    for (const s of sections) {
      const build = s.module?.build;
      if (build)
        Object.assign(refs, safe(`section ${s.id}`, () => build(ctxAt({ x: 0, y: 0, w, h }, "data-section", s.id, "k-layer"))));
    }
    for (const s of sections)
      for (const sc of s.scenes) {
        const ctx = ctxAt(layout.rects[sc.id], "data-scene", sc.id, "k-scene");
        const build = sc.module?.build;
        perScene.set(
          sc,
          build ? { ctx, refs: safe(sc.source, () => build(ctx)) } : { ctx, refs: undefined, title: renderDefault(sc, ctx.html) },
        );
      }
    gsap.set(world, { autoAlpha: 0, ...frame(first) });
    return { layout, el: world, tl, refs };
  });

  // Pass 2: timelines in step-list order (deck order), one label 'e:<global index>' after each step.
  let index = 0;
  for (const s of deck.sections) {
    const rt = runtimes.find((r) => r.layout.sectionIds.includes(s.id));
    if (!rt) continue;
    for (const sc of s.scenes) {
      const { ctx, refs, title } = perScene.get(sc)!;
      sc.steps.forEach((_, i) =>
        appendStep(rt.tl, `e:${index++}`, (tl) => {
          if (i === 0) {
            ctx.camera.to(tl, ctx.rect);
            if (title) tl.to(title, { autoAlpha: 1, duration: motion.step });
          }
          const fn = sc.module?.steps?.[i];
          if (fn) safe(`${sc.source} step ${i + 1}`, () => fn(tl, refs, ctx));
          else defaultStep(tl, sc, i + 1, ctx.html);
        }),
      );
    }
  }
  return runtimes;
}
