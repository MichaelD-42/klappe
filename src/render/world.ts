import { gsap } from "gsap";
import { addCameraMove, followView, frame, MAX_DEPTH, parallaxPose, parallaxScale } from "../camera";
import { code, LANGS } from "../fx/code";
import { KEN_BURNS, LOOP_VIDEO, STEP_LABEL, image, loopVideo, scrimFill, video, type ImageHandle } from "../fx/media";
import type { TransitionOpts } from "../fx/transitions";
import { t } from "../strings";
import { cleanSvg } from "../fx/draw";
import { aurora } from "./aurora";
import { part as fxPart } from "./parts";
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
  // Each scene's pinned background, by scene id, for the overview's cards.
  backgrounds: Record<string, HTMLElement>;
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
  lang && lang !== "console" && lang !== "chat" && !LANGS.includes(lang) ? `language "${lang}" not bundled; shown plain` : null;

// The media effect for a step: image, video, or chart from data/. The chart reads and checks the file
// itself (DATA MISSING, DATA ERROR). No chart title: the step text already names it.
function mediaShow(ctx: Ctx, m: NonNullable<StepDoc["media"]>, rect: Rect): StepAdder {
  if (m.kind === "image") return image(ctx, { href: m.href, alt: m.alt, rect }).show;
  if (m.kind === "video") return video(ctx, { href: m.href, title: m.title ?? m.alt, rect, fallback: m.fallback }).show;
  const c = fxPart("chart")(ctx, { src: m.href.replace(/^\.\//, ""), rect });
  return (tl) => {
    c.axes(tl);
    c.grow(tl);
    c.values(tl);
  };
}

const TITLE_LEAD = 0.4; // seconds the title starts before the camera lands

// Default renderer: the title and one p[data-step=n] per visible step, all hidden.
// Shout-outs use the shout effect. With media steps or a code fence, the text takes the left column and the
// media, code or terminal the right. Task-list items build one checklist, a table a comparison, a time-range list an agenda.
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
  // The code, terminal or chat in the slot, built once at the scene's first code, console or chat step.
  const term = fence?.lang === "console";
  const talk = fence?.lang === "chat";
  const fenceN = firstOf(term ? "console" : talk ? "chat" : "code");
  const chatFx = fence && fenceN && talk
    ? part(fenceN, "chat", slot, (c) => fxPart("chat")(c, { lines: fence.src.split("\n").filter((l) => l.trim()), ...(fence.avatars && { avatars: fence.avatars }), ...slot }))
    : undefined;
  const codeFx = fence && fenceN && !term && !talk ? part(fenceN, "code", slot, (c) => code(c, { src: fence.src, lang: fence.lang, ...slot })) : undefined;
  const termFx = fence && fenceN && term ? part(fenceN, "terminal", slot, (c) => fxPart("terminal")(c, { lines: fence.src.split("\n"), ...slot })) : undefined;
  // One checklist from all check items; one agenda per agenda step.
  const checks = scene.steps.filter((s) => s.part?.kind === "check");
  const checkN = firstOf("check");
  const list = checkN
    ? part(checkN, "checklist", lists, (c) =>
        fxPart("checklist")(c, { items: checks.map((s) => ({ text: s.text, done: s.part?.kind === "check" && s.part.done })), ...lists }),
      )
    : undefined;
  // One comparison table from the scene's Markdown table, a row per step.
  const tableN = firstOf("compare");
  const table = tableN && scene.table ? part(tableN, "compareTable", lists, (c) => fxPart("compareTable")(c, { ...scene.table!, ...lists })) : undefined;
  const title = add(col, el("h2", "", scene.title));
  let before: Element[] = []; // the previous media step's wrapper: it fades out when the next one shows

  scene.steps.forEach((s, i) => {
    const n = i + 1;
    if (fx.has(n)) return; // a later phase of a shout-out the effect plays
    if (s.kind === "shout-enter") {
      try {
        const h = fxPart("shout")(ctx, { question: s.text, answer: scene.steps[i + 1]?.text ?? "", intensity: meta.intensity });
        [h.enter, h.answer].forEach((f, k) => fx.set(n + k, f));
        return;
      } catch (e) {
        if (!notBuilt(e)) console.error(`${scene.source} step ${n}: shout: ${message(e)}`);
      }
    }
    const pt = s.part;
    if (pt?.kind === "check" && list) {
      const k = checks.indexOf(s);
      return fx.set(n, (tl) => {
        if (n === checkN) (list.h?.show ?? list.miss!)(tl);
        list.h?.[pt.fail ? "fail" : "tick"](k)(tl);
      });
    }
    if (pt?.kind === "compare" && table)
      return fx.set(n, (tl) => {
        if (n === tableN) (table.h?.show ?? table.miss!)(tl);
        table.h?.row(pt.row)(tl);
      });
    if (pt?.kind === "agenda") {
      const current = pt.rows.find((r) => r.current)?.title;
      const a = part(n, "agenda", lists, (c) => fxPart("agenda")(c, { rows: pt.rows, ...lists, ...(current ? { current } : {}) }));
      return fx.set(n, (a.h?.show ?? a.miss)!);
    }
    const p = add(col, el("p", s.kind === "shout-enter" ? "k-shout" : "", s.text));
    p.dataset.step = String(n);
    const fenced = codeFx ?? termFx ?? chatFx;
    if ((pt?.kind === "code" || pt?.kind === "console" || pt?.kind === "chat") && fenced) {
      return fx.set(n, (tl) => {
        tl.to(p, { autoAlpha: 1, duration: motion.step });
        if (n === fenceN) (fenced.h?.show ?? fenced.miss!)(tl);
        if (pt.kind === "code") codeFx?.h?.focus(fence!.groups[pt.group])(tl);
        else if (pt.kind === "console") termFx?.h?.run(pt.command)(tl);
        else chatFx?.h?.next()(tl);
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
  // Without the shout effect: the answer replaces the question.
  const q = kind === "shout-answer" ? at(n - 1) : null;
  if (q) tl.to(q, { autoAlpha: 0, duration: motion.step });
  const p = at(n);
  if (p) tl.to(p, { autoAlpha: 1, duration: motion.step }, q ? "<" : undefined);
}

// A step always takes time on both sides of its content, so a zero-duration tween (or none)
// never lands on a label and leaks into the previous step on seek or play.
const PAD = 0.001;
// Returns how many of the step's tweens start before the step does ("-=" or "<" first): they reach into the
// previous step, so playing it no longer matches a seek to it.
export function appendStep(tl: gsap.core.Timeline, label: string, add: (tl: gsap.core.Timeline) => void): number {
  tl.to({}, { duration: PAD });
  // shortcut: one label, moved every step, tells a helper where the current step starts (image() and video() use it);
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

// A background pinned to the screen: one cover picture, a looping video or an aurora in the canvas's pinned
// layer, under the world, so the camera moves the content over it. The timeline fades it in and out as scenes
// take turns. A video or an aurora moves on the wall clock: renderWorld plays it only while it is on screen.
interface Pinned {
  el: HTMLElement;
  push?: ImageHandle; // set while its Ken Burns push has not been put on the timeline yet
  loop?: { play(): void; pause(): void };
  layers: { el: HTMLElement; depth: number }[]; // the background's parallax layers, inside el
}
// An SVG file with its own animation: SMIL elements or CSS keyframes. A still one stays an <img>.
const ANIMATED_SVG = /<(?:animate|animateTransform|animateMotion|set)\b|@keyframes|\banimation\s*:/;

// The text of every background .svg file in the deck, by media key, for those that animate. The build is
// synchronous, so main.ts awaits this before the world renders; a file that fails to load stays an <img>.
export async function svgBackgrounds(deck: Deck): Promise<Record<string, string>> {
  const media = deck.files?.media ?? {};
  const hrefs = deck.sections.flatMap((s) => [s.module?.background, ...s.scenes.map((sc) => sc.module?.background)]).flatMap((b) =>
    b?.href && /\.svg$/i.test(b.href) ? [b.href.replace(/^\.\//, "")] : [],
  );
  const texts = await Promise.all(
    [...new Set(hrefs)].map(async (k) => [k, media[k] ? await fetch(media[k]).then((r) => r.text()).catch(() => "") : ""] as const),
  );
  return Object.fromEntries(texts.filter(([, t]) => ANIMATED_SVG.test(t)));
}

// An animated SVG file, sanitised (cleanSvg) and inlined in a shadow root, so its styles and ids stay its own.
// It covers the stage and starts paused: SMIL through pauseAnimations, CSS through a style that holds it.
function svgLoop(parent: HTMLElement, text: string): Pinned["loop"] | undefined {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = doc.documentElement as unknown as SVGSVGElement;
  if (svg.localName !== "svg" || doc.querySelector("parsererror")) return;
  cleanSvg(svg, true);
  const host = parent.appendChild(document.createElement("div"));
  host.setAttribute("data-k-svg-loop", "");
  host.setAttribute("data-k-ignore", "");
  Object.assign(host.style, { position: "absolute", inset: "0" });
  const root = host.attachShadow({ mode: "open" });
  const hold = root.appendChild(document.createElement("style"));
  hold.textContent = "* { animation-play-state: paused !important; }";
  const live = root.appendChild(document.importNode(svg, true));
  for (const [k, v] of Object.entries({ width: "100%", height: "100%", preserveAspectRatio: "xMidYMid slice" })) live.setAttribute(k, v);
  live.pauseAnimations();
  return {
    play: () => ((hold.disabled = true), live.unpauseAnimations()),
    pause: () => ((hold.disabled = false), live.pauseAnimations()),
  };
}

function background(ctx: Ctx, pinned: HTMLElement, bg: Background, source: string, id: string, svgText?: string): Pinned {
  const d = pinned.appendChild(el("div", "k-layer"));
  d.dataset.kBackground = id;
  Object.assign(d.style, { width: "1920px", height: "1080px" });
  const problem = (msg: string) => ctx.problem(`${source}: background: ${msg}`);
  const full = { ...ctx, rect: { x: 0, y: 0, w: 1920, h: 1080 }, html: d, problem };
  let img: ImageHandle | undefined;
  let loop: Pinned["loop"];
  if (typeof bg.animate === "function") {
    const own = d.appendChild(el("div", "k-layer"));
    own.setAttribute("data-k-ignore", "");
    Object.assign(own.style, { width: "1920px", height: "1080px", overflow: "hidden" });
    const animate = bg.animate;
    loop = safe(`${source}: background`, () => animate(own));
  } else if (bg.animate !== undefined) {
    if (bg.animate === "aurora") loop = aurora(d);
    else problem(`unknown animate "${bg.animate}"; use "aurora" or a function`);
  } else if (!bg.href) problem("needs an href or animate");
  else {
    if (svgText) {
      loop = svgLoop(d, svgText);
      if (!loop) problem(`${bg.href} animates but is not valid SVG; shown as a still picture`);
    }
    if (loop) {
      // an animated SVG file, inlined
    } else if (LOOP_VIDEO.test(bg.href)) {
      const v = safe(`${source}: background`, () => loopVideo(full, { href: bg.href!, alt: bg.alt }));
      if (v) loop = { play: () => void v.play().catch(() => {}), pause: () => v.pause() }; // a blocked play keeps the first frame
    } else img = safe(`${source}: background`, () => image(full, { href: bg.href!, alt: bg.alt ?? "", fit: "cover", scrim: bg.scrim, scrimSide: bg.scrimSide }));
  }
  if (d.children.length) gsap.set(d.children, { autoAlpha: 1 });
  // After the set above, which would raise the scrim to full black.
  if (loop && bg.scrim) {
    const s = d.appendChild(el("div", ""));
    Object.assign(s.style, { position: "absolute", inset: "0", background: scrimFill(bg.scrimSide), opacity: String(bg.scrim) });
  }
  // Parallax layers: each its own full-frame picture over the background, inside it, so it fades with it.
  const depthOk = (n: unknown) => typeof n === "number" && n > 0 && n <= MAX_DEPTH;
  if (typeof bg.parallax === "number" && !depthOk(bg.parallax)) problem(`parallax ${bg.parallax} out of range; use a depth above 0, up to ${MAX_DEPTH}`);
  const layers = (bg.layers ?? []).flatMap((l, i) => {
    if (!depthOk(l.parallax)) return problem(`layer ${i + 1}: parallax ${l.parallax} out of range; use a depth above 0, up to ${MAX_DEPTH}`), [];
    const e = d.appendChild(el("div", "k-layer"));
    e.dataset.kLayer = String(i + 1);
    Object.assign(e.style, { width: "1920px", height: "1080px" });
    const pic = safe(`${source}: background`, () => image({ ...full, html: e }, { href: l.href, alt: l.alt ?? "", fit: "cover" }));
    if (pic?.el && pic.el.querySelector("img")) pic.el.style.background = "transparent"; // a picture's frame is --k-bg; a layer shows through
    gsap.set(e.children, { autoAlpha: 1 });
    return [{ el: e, depth: l.parallax }];
  });
  gsap.set(d, { autoAlpha: 0 });
  return { el: d, push: bg.kenBurns ? img : undefined, loop, layers };
}

const INTENSE: TransitionKind[] = ["zoom", "crt", "shatter", "push", "glitch", "cube", "pageTurn", "magicMove"];

export function renderWorld(
  deck: Deck,
  canvases: CanvasLayout[],
  root: HTMLElement,
  // still: videos and auroras in backgrounds do not move (reduced motion, the self-test).
  // svg: the text of animated background .svg files, by media key (svgBackgrounds).
  // onProblem: also told of each ctx.problem, so one raised after load reaches the on-screen list.
  opts: { reducedMotion?: boolean; still?: boolean; svg?: Record<string, string>; onProblem?: (msg: string) => void } = {},
): CanvasRuntime[] {
  // Pass 1: all DOM and hidden initial state, before any timeline exists, so seek(0) = hidden.
  // ctx is what the scene's code gets; at(n) tells its problems which step is being added (0: none).
  const perScene = new Map<Scene, { ctx: Ctx; at: (n: number) => void; refs: any; title?: HTMLElement; fx?: Map<number, StepAdder>; bg?: Pinned }>();
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
    // Parallax backgrounds and layers on this canvas: k is the drift per unit of parallaxPose, in the parent's units.
    const far: { el: HTMLElement; k: number }[] = [];
    const drift = (p: { x: number; y: number }) => ({ x: (i: number) => far[i].k * p.x, y: (i: number) => far[i].k * p.y });
    const camera: Ctx["camera"] = {
      to(t, target, o) {
        if (["x", "y", "w", "h"].every((k) => cam[k as keyof Rect] === target[k as keyof Rect])) return; // already there
        // Reduced motion: camera flights become cuts (spec §7); the step padding keeps them off the labels.
        addCameraMove(t, world, cam, target, { ...o, instant: opts.reducedMotion });
        // Parallax backgrounds drift with the flight, from its start; a cut moves them at once.
        const pose = drift(parallaxPose(target, layout.size));
        const els = far.map((f) => f.el);
        if (far.length) opts.reducedMotion ? t.set(els, pose, "<") : t.to(els, { ...pose, duration: o?.duration ?? motion.camera, ease: "power2.inOut" }, "<");
        cam = target;
      },
      follow(t, point, o) {
        const from = cam; // read when the step is added: the camera's view at this step's start
        const view = (s: number) => followView(from, point(s), o?.zoom ?? 1.6, s);
        const end = view(1);
        const duration = o?.duration ?? motion.camera;
        // The pose is a pure function of this tween's progress (onUpdate fires on a seek too), so seek equals play.
        if (opts.reducedMotion) t.set(world, frame(end), o?.at);
        else t.to({}, { duration, ease: "none", onUpdate(this: gsap.core.Tween) { gsap.set(world, frame(view(this.progress()))); } }, o?.at);
        const pose = drift(parallaxPose(end, layout.size));
        const els = far.map((f) => f.el);
        if (far.length) opts.reducedMotion ? t.set(els, pose, "<") : t.to(els, { ...pose, duration, ease: "power2.inOut" }, "<");
        cam = end;
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
        problem: (msg) => (problems.push(msg), opts.onProblem?.(msg)),
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
          const svgText = bg.href ? opts.svg?.[bg.href.replace(/^\.\//, "")] : undefined;
          pins.set(bg, (pin = background(ctx, pinned, bg, source, own ? sc.id : s.id, svgText)));
          // Each scaled up so its edges stay out of view at its full drift; at rest where the canvas opens. A layer sits
          // inside the background, so its own scale and drift are what it adds to the background's.
          const base = bg.parallax === true ? 1 : typeof bg.parallax === "number" && bg.parallax > 0 ? Math.min(bg.parallax, MAX_DEPTH) : 0;
          const sb = parallaxScale(base);
          const at = parallaxPose(first, layout.size);
          const add = (e: HTMLElement, scale: number, k: number) => (gsap.set(e, { scale, x: k * at.x, y: k * at.y }), far.push({ el: e, k }));
          if (base) add(pin.el, sb, base);
          for (const l of pin.layers) add(l.el, parallaxScale(l.depth) / sb, (l.depth - base) / sb);
        }
        // The scene's code gets problems that name its file, and the step while one is being added.
        const file = sc.module ? sc.source.replace(/scene\.md$/, "scene.ts") : sc.source;
        let step = 0;
        const code: Ctx = { ...ctx, problem: (msg) => ctx.problem(`${file}${step ? ` step ${step}` : ""}: ${msg}`) };
        const build = sc.module?.build;
        perScene.set(sc, {
          ...(build ? { ctx: code, refs: safe(file, () => build(code)) } : { ctx: code, refs: undefined, ...renderDefault(sc, ctx, deck.meta) }),
          at: (n) => (step = n),
          bg: pin,
        });
      }
    // Only the background on screen moves. The one left behind stops once the camera has landed: it is
    // still fading out until then. A cut stops it at once.
    const loops = [...pins.values()].filter((p) => p.loop);
    if (loops.length && !opts.still) {
      const bgOf = new Map(sections.flatMap((s) => s.scenes).map((sc) => [sc.id, perScene.get(sc)?.bg]));
      let stop: gsap.core.Tween | undefined;
      stepListeners.push(({ play, scene }) => {
        const on = scene === null ? undefined : bgOf.get(scene); // undefined for a scene on another canvas
        stop?.kill();
        on?.loop?.play();
        const off = () => loops.forEach((p) => p !== on && p.loop!.pause());
        if (play) stop = gsap.delayedCall(motion.camera, off);
        else off();
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
        // Reduced motion: the dive, the CRT flash, the shatter, the push, the glitch, the cube, the page turn and the magic move fade instead.
        const kind = opts.reducedMotion && INTENSE.includes(m?.transition as TransitionKind) ? "fade" : m?.transition ?? "fade";
        return [s.id, { kind, opts: { ...m?.transitionOptions, ...(m?.zoomTarget ? { target: m.zoomTarget } : {}) } }];
      }),
    );
    const backgrounds = Object.fromEntries(sections.flatMap((s) => s.scenes).flatMap((sc) => {
      const bg = perScene.get(sc)?.bg;
      return bg ? [[sc.id, bg.el]] : [];
    }));
    return { layout, el: canvas, world, tl, refs, entries, stepListeners, problems, backgrounds };
  });

  // Pass 2: timelines in step-list order (deck order), one label 'e:<global index>' after each step.
  let index = 0;
  for (const s of deck.sections) {
    const rt = runtimes.find((r) => r.layout.sectionIds.includes(s.id));
    if (!rt) continue;
    for (const sc of s.scenes) {
      const { ctx, at, refs, title, fx, bg } = perScene.get(sc)!;
      sc.steps.forEach((_, i) => {
        at(i + 1);
        const early = appendStep(rt.tl, `e:${index++}`, (tl) => {
          const start = tl.duration();
          if (i === 0) {
            ctx.camera.to(tl, ctx.rect);
            // Over the flight's last 0.4 s, so the frame is never empty after it lands; not before the step (a cut).
            if (title) tl.to(title, { autoAlpha: 1, duration: motion.step }, Math.max(start, tl.duration() - TITLE_LEAD));
          }
          const fn = sc.module?.steps?.[i];
          if (fn) safe(`${sc.source.replace(/scene\.md$/, "scene.ts")} step ${i + 1}`, () => fn(tl, refs, ctx));
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
        if (early) ctx.problem(`${early} tween(s) start before the step; do not begin a step with "<" or "-="`);
        at(0);
      });
    }
  }
  return runtimes;
}
