import { gsap } from "gsap";
import { addCameraMove, frame } from "../camera";
import { agenda, chart, checklist, code, image, shout, terminal, video } from "../fx";
import { LANGS } from "../fx/code";
import { KEN_BURNS, STEP_LABEL, type ImageHandle } from "../fx/media";
import type { TransitionOpts } from "../fx/transitions";
import { t } from "../strings";
import { motion } from "../theme";
import type { Background, CanvasLayout, Ctx, Deck, DeckMeta, Rect, Scene, StepAdder, StepDoc, TransitionKind } from "../types";

export interface CanvasRuntime {
  layout: CanvasLayout;
  // The canvas as transitions show, hide and move it: the pinned backgrounds and the world.
  el: HTMLElement;
  // The camera moves this; it holds the SVG and HTML layers.
  world: HTMLElement;
  tl: gsap.core.Timeline;
  refs: Record<string, any>;
  // How the deck enters each section on this canvas, by section id (from section.ts).
  entries: Record<string, { kind: TransitionKind; opts: TransitionOpts }>;
  // ctx.onStep listeners; the stepper calls them on every move.
  stepListeners: Parameters<Ctx["onStep"]>[0][];
  // ctx.problem messages; the self-test adds them to the deck's problems.
  problems: string[];
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

// A stub in src/fx throws this until its effect is built; the engine then falls back.
const notBuilt = (e: unknown) => e instanceof Error && e.message.endsWith(": not built yet");
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

// A code fence in a language Shiki does not bundle still shows, as plain text.
export const fenceProblem = (lang: string) =>
  lang && lang !== "console" && !LANGS.includes(lang) ? `language "${lang}" not bundled; shown plain` : null;

// The media effect for a step: image, video, or chart from data/. The chart reads and checks the file
// itself (DATA MISSING, DATA ERROR). No chart title: the step text already names it.
function mediaShow(ctx: Ctx, m: NonNullable<StepDoc["media"]>, rect: Rect): StepAdder {
  if (m.kind === "image") return image(ctx, { href: m.href, alt: m.alt, rect }).show;
  if (m.kind === "video") return video(ctx, { href: m.href, title: m.title ?? m.alt, rect, fallback: m.fallback }).show;
  const c = chart(ctx, { src: m.href.replace(/^\.\//, ""), rect });
  return (tl) => {
    c.axes(tl);
    c.grow(tl);
    c.values(tl);
  };
}

// Default renderer: the title and one p[data-step=n] per visible step, all hidden.
// Shout-outs use the shout effect. With media steps or a code fence, the text takes the left column and the
// media, code or terminal the right. Task-list items build one checklist, a time-range list an agenda.
// Returns the title and the steps an effect plays, by step number.
function renderDefault(scene: Scene, ctx: Ctx, meta: DeckMeta): { title: HTMLElement; fx: Map<number, StepAdder> } {
  const { html, rect } = ctx;
  const fx = new Map<number, StepAdder>();
  const shown: Element[] = [];
  const add = <E extends Element>(parent: Element, e: E) => (parent.append(e), shown.push(e), e);
  const fence = scene.fence;
  const hasMedia = scene.steps.some((s) => s.media) || !!fence;
  const col = hasMedia ? html.appendChild(el("div", "")) : html;
  if (hasMedia) col.style.width = "45%";
  const slot: Rect = { x: rect.w * 0.5, y: rect.h * 0.13, w: rect.w * 0.42, h: rect.h * 0.74 };
  // An effect that throws (a stub: not built yet) leaves a dashed EFFECT MISSING box in its place and a problem.
  const missing = (parent: Element, at: Rect, where: string, name: string, e: unknown): StepAdder => {
    if (!notBuilt(e)) console.error(`${where}: ${name}: ${message(e)}`);
    const label = `${t("effectMissing", meta.lang)}: ${name}`;
    ctx.problem(`${where}: ${label} (${message(e)})`);
    const box = add(parent, el("div", "", label));
    Object.assign(box.style, {
      position: "absolute",
      left: `${at.x}px`,
      top: `${at.y}px`,
      width: `${at.w}px`,
      height: `${at.h}px`,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "4px dashed var(--k-accent)",
      background: "var(--k-bg)",
      color: "var(--k-accent)",
      fontSize: "48px",
      fontWeight: "700",
    });
    return (tl) => tl.to(box, { autoAlpha: 1, duration: motion.step });
  };
  // Builds the effect for a Markdown part, with problems that say where: its handle h, or miss when it throws.
  const part = <T>(n: number, name: string, at: Rect, make: (c: Ctx) => T): { h?: T; miss?: StepAdder } => {
    const where = `${scene.source} step ${n}`;
    try {
      return { h: make({ ...ctx, problem: (msg) => ctx.problem(`${where}: ${msg}`) }) };
    } catch (e) {
      return { miss: missing(html, at, where, name, e) };
    }
  };
  const lists: Rect = { x: rect.w * 0.083, y: rect.h * 0.28, w: rect.w * (hasMedia ? 0.37 : 0.83), h: rect.h * 0.6 };
  const firstOf = (kind: string) => scene.steps.findIndex((s) => s.part?.kind === kind) + 1;
  if (fence) {
    const lang = fenceProblem(fence.lang);
    if (lang) ctx.problem(`${scene.source}: ${lang}`);
  }
  // The code or terminal in the slot, built once at the scene's first code or console step.
  const term = fence?.lang === "console";
  const fenceN = firstOf(term ? "console" : "code");
  const codeFx = fence && fenceN && !term ? part(fenceN, "code", slot, (c) => code(c, { src: fence.src, lang: fence.lang, ...slot })) : undefined;
  const termFx = fence && fenceN && term ? part(fenceN, "terminal", slot, (c) => terminal(c, { lines: fence.src.split("\n"), ...slot })) : undefined;
  // One checklist from all check items; one agenda per agenda step.
  const checks = scene.steps.filter((s) => s.part?.kind === "check");
  const checkN = firstOf("check");
  const list = checkN
    ? part(checkN, "checklist", lists, (c) =>
        checklist(c, { items: checks.map((s) => ({ text: s.text, done: s.part?.kind === "check" && s.part.done })), ...lists }),
      )
    : undefined;
  const title = add(col, el("h2", "", scene.title));
  let before: Element[] = []; // the previous media step's wrapper: it fades out when the next one shows

  scene.steps.forEach((s, i) => {
    const n = i + 1;
    if (fx.has(n)) return; // a later phase of a shout-out the effect plays
    if (s.kind === "shout-enter") {
      try {
        const h = shout(ctx, { question: s.text, answer: scene.steps[i + 3]?.text ?? "", intensity: meta.intensity });
        [h.enter, h.hold, h.fade, h.answer].forEach((f, k) => fx.set(n + k, f));
        return;
      } catch (e) {
        if (!notBuilt(e)) console.error(`${scene.source} step ${n}: shout: ${message(e)}`);
      }
    }
    if (s.kind === "shout-hold" || s.kind === "shout-fade") return;
    const pt = s.part;
    if (pt?.kind === "check" && list) {
      const k = checks.indexOf(s);
      return fx.set(n, (tl) => {
        if (n === checkN) (list.h?.show ?? list.miss!)(tl);
        list.h?.tick(k)(tl);
      });
    }
    if (pt?.kind === "agenda") {
      const current = pt.rows.find((r) => r.current)?.title;
      const a = part(n, "agenda", lists, (c) => agenda(c, { rows: pt.rows, ...lists, ...(current ? { current } : {}) }));
      return fx.set(n, (a.h?.show ?? a.miss)!);
    }
    const p = add(col, el("p", s.kind === "shout-enter" ? "k-shout" : "", s.text));
    p.dataset.step = String(n);
    const fenced = codeFx ?? termFx;
    if ((pt?.kind === "code" || pt?.kind === "console") && fenced) {
      return fx.set(n, (tl) => {
        tl.to(p, { autoAlpha: 1, duration: motion.step });
        if (n === fenceN) (fenced.h?.show ?? fenced.miss!)(tl);
        if (pt.kind === "code") codeFx?.h?.focus(fence!.groups[pt.group])(tl);
        else termFx?.h?.run(pt.command)(tl);
      });
    }
    if (!s.media) return;
    // Each media step builds in its own wrapper: a full-scene div and an SVG group with an opaque
    // backdrop under the slot. Coordinates stay scene-local.
    const wrap = add(html, el("div", ""));
    Object.assign(wrap.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%" });
    const g = add(ctx.svg, document.createElementNS(SVG, "g"));
    const back = document.createElementNS(SVG, "rect");
    for (const [k, v] of Object.entries({ x: slot.x, y: slot.y, width: slot.w, height: slot.h })) back.setAttribute(k, String(v));
    back.style.fill = "var(--k-bg)";
    g.append(back);
    for (const e of [wrap, g]) e.setAttribute("data-k-media", String(n));
    const wrapper = [wrap, g];
    const previous = before;
    before = wrapper;
    let show: StepAdder;
    try {
      // The effect's problems say where the slot is.
      const problem = (msg: string) => ctx.problem(`${scene.source} step ${n}: ${msg}`);
      show = mediaShow({ ...ctx, html: wrap, svg: g, problem }, s.media, slot);
    } catch (e) {
      show = missing(wrap, slot, `${scene.source} step ${n}`, s.media.kind, e);
    }
    fx.set(n, (tl) => {
      tl.to(p, { autoAlpha: 1, duration: motion.step });
      tl.to(wrapper, { autoAlpha: 1, duration: motion.step }, "<");
      if (previous.length) tl.to(previous, { autoAlpha: 0, duration: motion.step }, "<");
      show(tl);
    });
  });
  gsap.set(shown, { autoAlpha: 0 });
  return { title, fx };
}

function defaultStep(tl: gsap.core.Timeline, scene: Scene, n: number, html: HTMLElement, fx?: Map<number, StepAdder>) {
  const effect = fx?.get(n);
  if (effect) return effect(tl);
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
// Returns how many of the step's tweens start before the step does ("-=" or "<" first): they reach into the
// previous step, so playing it no longer matches a seek to it.
export function appendStep(tl: gsap.core.Timeline, label: string, add: (tl: gsap.core.Timeline) => void): number {
  tl.to({}, { duration: PAD });
  // shortcut: one label, moved every step, tells a helper where the current step starts (image() uses it);
  // read it only while the step is built. Upgrade to a step-start argument if more helpers need it.
  tl.addLabel(STEP_LABEL);
  const start = tl.duration();
  const before = new Set(tl.getChildren(false));
  add(tl);
  const early = tl.getChildren(false).filter((c) => !before.has(c) && c.startTime() < start - 1e-6).length;
  tl.to({}, { duration: PAD });
  tl.addLabel(label);
  return early;
}

// A background pinned to the screen: one cover image in the canvas's pinned layer, under the world, so the
// camera moves the content over a still picture. The timeline fades it in and out as scenes take turns.
interface Pinned {
  el: HTMLElement;
  push?: ImageHandle; // set while its Ken Burns push has not been put on the timeline yet
}
function background(ctx: Ctx, pinned: HTMLElement, bg: Background, source: string, id: string): Pinned {
  const d = pinned.appendChild(el("div", "k-layer"));
  d.dataset.kBackground = id;
  Object.assign(d.style, { width: "1920px", height: "1080px" });
  const problem = (msg: string) => ctx.problem(`${source}: background: ${msg}`);
  const img = safe(`${source}: background`, () =>
    image({ ...ctx, rect: { x: 0, y: 0, w: 1920, h: 1080 }, html: d, problem }, { href: bg.href, alt: bg.alt ?? "", fit: "cover", scrim: bg.scrim }),
  );
  gsap.set(d.children, { autoAlpha: 1 });
  gsap.set(d, { autoAlpha: 0 });
  return { el: d, push: bg.kenBurns ? img : undefined };
}

const INTENSE: TransitionKind[] = ["zoom", "crt", "shatter"];

export function renderWorld(
  deck: Deck,
  canvases: CanvasLayout[],
  root: HTMLElement,
  opts: { reducedMotion?: boolean } = {},
): CanvasRuntime[] {
  // Pass 1: all DOM and hidden initial state, before any timeline exists, so seek(0) = hidden.
  const perScene = new Map<Scene, { ctx: Ctx; refs: any; title?: HTMLElement; fx?: Map<number, StepAdder>; bg?: Pinned }>();
  const onScreen = new Map<CanvasLayout, Pinned | undefined>(); // the background each canvas shows, while pass 2 builds
  const files = deck.files ?? { data: {}, media: {} };
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
    // The canvas: backgrounds pinned to the screen, under the world the camera moves.
    const canvas = el("div", "k-canvas");
    const pinned = el("div", "k-layer");
    for (const e of [canvas, pinned]) Object.assign(e.style, { width: "1920px", height: "1080px" });
    canvas.append(pinned, world);
    root.append(canvas);

    const tl = gsap.timeline({ paused: true });
    const refs: Record<string, any> = {};
    const stepListeners: CanvasRuntime["stepListeners"] = [];
    const problems: string[] = [];
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
      return {
        rect,
        svg: g,
        html: d,
        canvas: { refs, rects: layout.rects },
        camera,
        files,
        onStep: (fn) => stepListeners.push(fn),
        problem: (msg) => problems.push(msg),
        reducedMotion: opts.reducedMotion,
        deck: { lang: deck.meta.lang, intensity: deck.meta.intensity },
      };
    };

    for (const s of sections) {
      const build = s.module?.build;
      if (build)
        Object.assign(refs, safe(`section ${s.id}`, () => build(ctxAt({ x: 0, y: 0, w, h }, "data-section", s.id, "k-layer"))));
    }
    // One pinned element per background: the section's is shared by every scene that does not set its own.
    const pins = new Map<Background, Pinned>();
    for (const s of sections)
      for (const sc of s.scenes) {
        const ctx = { ...ctxAt(layout.rects[sc.id] ?? { x: 0, y: 0, w: 1920, h: 1080 }, "data-scene", sc.id, "k-scene"), scene: sc.id, doc: sc };
        const own = sc.module?.background;
        const bg = own ?? s.module?.background;
        let pin = bg && pins.get(bg);
        if (bg && !pin) {
          const source = own ? sc.source : `${sc.source.split("/").slice(0, -2).join("/")}/section.ts`;
          pins.set(bg, (pin = background(ctx, pinned, bg, source, own ? sc.id : s.id)));
        }
        const build = sc.module?.build;
        perScene.set(sc, {
          ...(build ? { ctx, refs: safe(sc.source, () => build(ctx)) } : { ctx, refs: undefined, ...renderDefault(sc, ctx, deck.meta) }),
          bg: pin,
        });
      }
    // The first scene's background shows from load, so it fades in with its canvas.
    const bg0 = perScene.get(sections.flatMap((s) => s.scenes)[0])?.bg;
    if (bg0) gsap.set(bg0.el, { autoAlpha: 1 });
    onScreen.set(layout, bg0);
    gsap.set(world, frame(first));
    gsap.set(canvas, { autoAlpha: 0 });
    const entries = Object.fromEntries(
      sections.map((s) => {
        const m = s.module;
        // Reduced motion: the dive, the CRT flash and the shatter fade instead.
        const kind = opts.reducedMotion && INTENSE.includes(m?.transition as TransitionKind) ? "fade" : m?.transition ?? "fade";
        return [s.id, { kind, opts: { ...m?.transitionOptions, ...(m?.zoomTarget ? { target: m.zoomTarget } : {}) } }];
      }),
    );
    return { layout, el: canvas, world, tl, refs, entries, stepListeners, problems };
  });

  // Pass 2: timelines in step-list order (deck order), one label 'e:<global index>' after each step.
  let index = 0;
  for (const s of deck.sections) {
    const rt = runtimes.find((r) => r.layout.sectionIds.includes(s.id));
    if (!rt) continue;
    for (const sc of s.scenes) {
      const { ctx, refs, title, fx, bg } = perScene.get(sc)!;
      sc.steps.forEach((_, i) => {
        const early = appendStep(rt.tl, `e:${index++}`, (tl) => {
          const start = tl.duration();
          if (i === 0) {
            ctx.camera.to(tl, ctx.rect);
            if (title) tl.to(title, { autoAlpha: 1, duration: motion.step });
          }
          const fn = sc.module?.steps?.[i];
          if (fn) safe(`${sc.source} step ${i + 1}`, () => fn(tl, refs, ctx));
          else defaultStep(tl, sc, i + 1, ctx.html, fx);
          // Last, so the step's content does not wait for them: they run alongside from the step's start.
          if (i === 0) {
            // The camera arrives at a scene with another background: the two cross-fade during the flight.
            const was = onScreen.get(rt.layout);
            if (bg !== was) {
              if (bg) tl.to(bg.el, { autoAlpha: 1, duration: motion.camera }, start);
              if (was) tl.to(was.el, { autoAlpha: 0, duration: motion.camera }, start);
              onScreen.set(rt.layout, bg);
            }
            // Ken Burns once per background, from the first scene that shows it.
            bg?.push?.move(tl, { duration: KEN_BURNS }, start);
            if (bg) bg.push = undefined;
          }
        });
        if (early) ctx.problem(`${sc.source} step ${i + 1}: ${early} tween(s) start before the step; do not begin a step with "<" or "-="`);
      });
    }
  }
  return runtimes;
}
