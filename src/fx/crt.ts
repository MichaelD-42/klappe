import { gsap } from "gsap";
import type { CanvasRuntime } from "../render/world";
import type { Ctx, StepAdder } from "../types";
import type { TransitionOpts } from "./transitions";

// A boot line. { text: "MEMORY TEST: 640K OK", count: true } types its label, then counts up to the number.
export type CrtLine = string | { text: string; count?: true };
export interface CrtOpts {
  color?: CrtColor; // default green; any other string is a CSS colour
  lines: CrtLine[];
  // Lines typed after READY., on the cursor row, one prompt() step each. Declared here so their DOM exists at build.
  prompts?: string[];
}
export interface CrtHandle {
  powerOn: StepAdder;
  // Only the brightness settle of powerOn, no beam: for a CRT that the crt transition already flashed on.
  settle: StepAdder;
  type(tl: gsap.core.Timeline, line: number | "all"): void;
  ready: StepAdder;
  // Types prompts[index] on the cursor row; the cursor then rests on the next row. cps defaults to 8 (a human).
  prompt(tl: gsap.core.Timeline, index: number, opts?: { cps?: number; at?: gsap.Position }): void;
  hideCursor(tl: gsap.core.Timeline, at?: gsap.Position): void;
  // The cursor block's centre, scene-local, on its row after all prompts are typed.
  cursorAt(): { x: number; y: number };
  // Dims the screen (text and scanlines) to brightness `to`, default 0.3. Each call starts at the level the call
  // before it left, so dim(tl, { to: 1 }) brings it back.
  dim(tl: gsap.core.Timeline, opts?: { to?: number; at?: gsap.Position }): void;
  // The .k-retro element: the whole CRT, for a scene that moves or fades it.
  root: HTMLElement;
}

const COLORS: Record<string, string> = { green: "var(--k-phosphor)", amber: "var(--k-phosphor-amber)", teal: "#009A9B" };
export type CrtColor = "green" | "amber" | "teal" | (string & {});
// The CSS colour for a crt colour option: a named one, else the string itself, else green.
export const crtColor = (color?: CrtColor): string => (color ? (COLORS[color] ?? color) : COLORS.green);
const CPS = 34; // typing speed, characters per second (the spike's value)
const HUMAN_CPS = 8;
const COUNT = 1.4; // seconds a count line counts up
const PAUSE = 0.15; // between lines when typing them all
const CURSOR = "█"; // the block that trails the text while a line types
const COUNTED = /^(.+?:\s*)(\d+)K( OK)?$/; // label, number, optional " OK"

// The line's text at typing progress p: the first round(p * len) characters.
export const typed = (full: string, p: number): string => full.slice(0, Math.round(p * full.length));

const countDuration = (label: string) => label.length / CPS + COUNT;

// A count line at progress p: the label types, then the number counts up in 16K steps, then " OK".
export function counted(full: string, p: number): string {
  const m = COUNTED.exec(full);
  if (!m) return typed(full, p);
  const [, label, num, ok = ""] = m;
  const split = label.length / CPS / countDuration(label);
  if (p < split) return typed(label, p / split);
  const k = Math.round((((p - split) / (1 - split)) * +num) / 16) * 16;
  return `${label}${String(Math.min(k, +num)).padStart(num.length, " ")}K${p >= 1 ? ok : ""}`;
}

// The terminal box inside the scene: the screen is inset 40 px, the text 170 px from the sides,
// 140 px from the top and 100 px from the bottom.
const BOX = { w: 80 + 340, h: 80 + 240 };
const TERM = { x: 40 + 170, y: 40 + 140 }; // the text's top-left, scene-local
const MAX_FONT = 46; // the spike's size
export const MIN_FONT = 20; // 14.2 px at 1366, the legibility floor
const LINE_H = 1.5;
const CHAR_W = 0.6; // monospace advance in em, a little wide for safety

// The largest font size up to 46 px at which rows x cols fit in w x h. fits: false when even MIN_FONT clips.
export function fitFont(rows: number, cols: number, w: number, h: number): { size: number; fits: boolean } {
  const size = Math.min(MAX_FONT, h / (rows * LINE_H), w / (Math.max(1, cols) * CHAR_W));
  return { size: Math.max(MIN_FONT, Math.floor(size)), fits: size >= MIN_FONT };
}

// The centre of the cursor block (.6em x 1em) on text row `row` at font size `size`, scene-local.
export const cursorCentre = (row: number, size: number) => ({ x: TERM.x + 0.3 * size, y: TERM.y + (row + 0.5) * LINE_H * size });

// The spike's look, scoped to .k-retro (the only place monospace is allowed). Flicker and blink are
// CSS loops on leaf elements marked data-k-ignore, so the self-test snapshot skips them.
// Colours come from tokens; the raw rgba and #fff values are light and shadow layers, not theme colours.
const CSS = `
.k-retro { position: absolute; inset: 0; background: color-mix(in srgb, var(--k-bg) 40%, var(--k-blackout)); --k-crt: var(--k-phosphor); }
.k-retro .k-crt-screen { position: absolute; inset: 40px; border-radius: 60px / 50px; overflow: hidden;
  background: radial-gradient(ellipse at 50% 45%, color-mix(in srgb, var(--k-crt) 11%, var(--k-blackout)) 0%, color-mix(in srgb, var(--k-crt) 5%, var(--k-blackout)) 60%, var(--k-blackout) 100%); }
.k-retro .k-crt-term { position: absolute; left: 170px; top: 140px; right: 170px; font: 500 46px/1.5 "Cascadia Mono", Consolas, "Courier New", monospace;
  color: var(--k-crt); white-space: pre;
  text-shadow: 0 0 4px var(--k-crt), 0 0 18px color-mix(in srgb, var(--k-crt) 55%, transparent); }
.k-retro .k-crt-term > div { min-height: 1.5em; }
.k-retro .k-crt-cursor { display: inline-block; width: .6em; height: 1em; vertical-align: -0.12em;
  background: var(--k-crt); box-shadow: 0 0 14px var(--k-crt); animation: k-crt-blink 1s infinite steps(1); }
.k-retro .k-crt-scan { position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(to bottom, rgba(0,0,0,.32) 0 2px, transparent 2px 4px); }
.k-retro .k-crt-vignette { position: absolute; inset: 0; pointer-events: none; border-radius: inherit;
  background: radial-gradient(ellipse at 30% 18%, rgba(255,255,255,.07), transparent 40%), radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,.75) 100%);
  box-shadow: inset 0 0 120px 30px rgba(0,0,0,.85); }
.k-retro .k-crt-flicker { position: absolute; inset: 0; pointer-events: none; background: var(--k-blackout); opacity: 0;
  animation: k-crt-flicker 3.2s infinite steps(1); }
.k-retro .k-crt-beam { position: absolute; inset: 40px; border-radius: 60px / 50px; background: color-mix(in srgb, var(--k-crt) 35%, #fff);
  box-shadow: 0 0 60px 20px color-mix(in srgb, var(--k-crt) 70%, transparent); }
@keyframes k-crt-blink { 50% { opacity: 0; } }
@keyframes k-crt-flicker { 0% { opacity: 0; } 31% { opacity: .06; } 33% { opacity: 0; } 67% { opacity: .03; } 69% { opacity: 0; } }
`;

function addStyle() {
  if (document.getElementById("k-crt-style")) return;
  const s = document.createElement("style");
  s.id = "k-crt-style";
  s.textContent = CSS;
  document.head.append(s);
}

const div = (parent: Element, cls: string) => parent.appendChild(Object.assign(document.createElement("div"), { className: cls }));

export function crt(ctx: Ctx, opts: CrtOpts): CrtHandle {
  addStyle();
  const lines = opts.lines.map((l) => (typeof l === "string" ? { text: l, count: false } : { text: l.text, count: !!l.count }));
  const prompts = opts.prompts ?? [];
  for (const l of lines)
    if (l.count && !COUNTED.test(l.text))
      ctx.problem(`crt: count line "${l.text}" needs a label and a number with K, like "MEMORY TEST: 640K OK"`);
  const root = div(ctx.html, "k-retro");
  if (opts.color && opts.color !== "green") root.style.setProperty("--k-crt", crtColor(opts.color));
  const screen = div(root, "k-crt-screen");
  const term = div(screen, "k-crt-term");
  // Rows: the lines, READY., the prompts and the cursor row. Columns: the longest line plus the typing cursor.
  const texts = [...lines.map((l) => l.text), ...prompts];
  const fit = fitFont(lines.length + 2 + prompts.length, Math.max(0, ...texts.map((t) => t.length)) + 1, ctx.rect.w - BOX.w, ctx.rect.h - BOX.h);
  if (!fit.fits) ctx.problem(`crt: ${lines.length + prompts.length} lines do not fit the screen even at ${MIN_FONT} px; shorten or split them`);
  term.style.fontSize = `${fit.size}px`;
  const lineEls = lines.map(() => {
    const e = div(term, "");
    e.dataset.kText = "";
    return e;
  });
  // READY., one row per prompt, then the cursor's last row. Each row has its own cursor, so nothing moves:
  // prompt() hides one row's cursor and shows the next one's.
  const ready = div(term, "");
  ready.append("READY.");
  const promptEls: HTMLElement[] = [];
  const cursors = [...prompts, ""].map((_, i) => {
    const row = div(ready, "");
    if (i < prompts.length) {
      const e = row.appendChild(document.createElement("span"));
      e.dataset.kText = "";
      promptEls.push(e);
    }
    const c = div(row, "k-crt-cursor");
    c.setAttribute("data-k-ignore", "");
    return c;
  });
  div(screen, "k-crt-scan");
  div(screen, "k-crt-vignette");
  div(screen, "k-crt-flicker").setAttribute("data-k-ignore", "");
  const beam = div(root, "k-crt-beam");
  gsap.set([root, screen, beam, ready, ...cursors.slice(1)], { autoAlpha: 0 });
  // The beam's start pose is set at build too: a seek back before powerOn then writes the same transform as a fresh load.
  gsap.set(beam, { scaleX: 0, scaleY: 0.004 });

  // Types text into e from onUpdate, a pure function of progress; the block trails the text while it types.
  const typeInto = (tl: gsap.core.Timeline, e: HTMLElement, text: string, textAt: typeof typed, duration: number, at?: gsap.Position) =>
    tl.to(
      {},
      {
        duration,
        ease: "none",
        onUpdate(this: gsap.core.Tween) {
          const p = this.progress();
          e.textContent = textAt(text, p) + (p > 0 && p < 1 ? CURSOR : "");
        },
      },
      at,
    );

  const typeLine = (tl: gsap.core.Timeline, i: number, at?: string) => {
    const line = lines[i];
    if (!line) throw new Error(`crt: no line ${i} (${lines.length} lines)`);
    const m = line.count ? COUNTED.exec(line.text) : null; // a bad count line was reported and just types
    typeInto(tl, lineEls[i], line.text, m ? counted : typed, m ? countDuration(m[1]) : Math.max(0.1, line.text.length / CPS), at);
  };

  // Bright and blurred to the glowing terminal; powerOn and settle share it.
  const settleScreen = (tl: gsap.core.Timeline, at?: gsap.Position) =>
    tl.fromTo(
      screen,
      { filter: "brightness(2.2) blur(2px)" },
      { filter: "brightness(1) blur(0px)", duration: 1.1, ease: "power2.out", immediateRender: false },
      at,
    );

  let level = 1; // the brightness the last dim() left; step adders run in order at load
  return {
    // The spike's power-on: a line flashes across, opens to a bright screen, which fades to the glowing terminal.
    powerOn(tl) {
      tl.set(root, { autoAlpha: 1 });
      tl.fromTo(beam, { scaleX: 0, scaleY: 0.004, autoAlpha: 1 }, { scaleX: 1, duration: 0.22, ease: "power3.out", immediateRender: false });
      tl.to(beam, { scaleY: 1, duration: 0.2, ease: "expo.in" });
      tl.set(screen, { autoAlpha: 1 });
      tl.to(beam, { autoAlpha: 0, duration: 0.7, ease: "power2.out" });
      settleScreen(tl, "<");
    },
    settle(tl) {
      tl.set([root, screen], { autoAlpha: 1 });
      settleScreen(tl, "<");
    },
    type(tl, line) {
      if (line === "all") lines.forEach((_, i) => typeLine(tl, i, i ? `+=${PAUSE}` : undefined));
      else typeLine(tl, line);
    },
    ready(tl) {
      tl.fromTo(ready, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, immediateRender: false });
    },
    prompt(tl, i, { cps = HUMAN_CPS, at } = {}) {
      const text = prompts[i];
      if (text === undefined) throw new Error(`crt: no prompt ${i} (${prompts.length} prompts)`);
      tl.set(cursors[i], { autoAlpha: 0 }, at);
      typeInto(tl, promptEls[i], text, typed, Math.max(0.1, text.length / cps), "<");
      tl.set(cursors[i + 1], { autoAlpha: 1 }, ">");
    },
    hideCursor(tl, at) {
      tl.set(cursors, { autoAlpha: 0 }, at);
    },
    cursorAt: () => cursorCentre(lines.length + 1 + prompts.length, fit.size),
    dim(tl, { to = 0.3, at } = {}) {
      // The same filter list as settleScreen, so both tween one filter on the screen.
      const from = `brightness(${level}) blur(0px)`;
      tl.fromTo(screen, { filter: from }, { filter: `brightness(${to}) blur(0px)`, duration: 0.6, ease: "power2.out", immediateRender: false }, at);
      level = to;
    },
    root,
  };
}

// The old canvas collapses to a bright line and a dot, then a line flashes across and opens into the new canvas.
// It squashes the layer that holds all canvases, so each canvas keeps its own camera pose. The glow around
// the line is a gradient on the stage behind that layer, so the squash does not flatten it.
export function transitionCrt(
  from: CanvasRuntime,
  to: CanvasRuntime,
  opts: TransitionOpts & { color?: CrtColor },
): gsap.core.Timeline {
  const worlds = from.el.parentElement!;
  const stage = worlds.parentElement!;
  // GSAP tweens rgba, not var() or color-mix(), so the browser resolves the colour (a token, a name, hex) to rgb on a probe.
  const probe = stage.appendChild(document.createElement("div"));
  probe.style.color = crtColor(opts.color);
  const [r, g, b] = gsap.utils.splitColor(getComputedStyle(probe).color || "#fff") as number[];
  probe.remove();
  const mix = (c: number) => Math.round(c + (255 - c) * 0.7);
  const line = `${mix(r)}, ${mix(g)}, ${mix(b)}`; // the phosphor colour 70 % toward white
  const band = (w: number, a: number) =>
    `radial-gradient(ellipse ${w}% 8% at 50% 50%, rgba(${r}, ${g}, ${b}, ${a}) 0%, rgba(${r}, ${g}, ${b}, 0) 100%)`;
  const glow = (fromW: number, fromA: number, toW: number, toA: number, duration: number, ease: string) =>
    [stage, { backgroundImage: band(fromW, fromA) }, { backgroundImage: band(toW, toA), duration, ease, immediateRender: false }, "<"] as const;
  return gsap
    .timeline()
    .set(stage, { backgroundColor: "var(--k-blackout)" })
    .set(to.el, { autoAlpha: 0 })
    // The frame fades into the line tint as it squashes: brightness(3) here clipped a saturated colour to pure hue (teal to cyan).
    .set(worlds, { backgroundColor: `rgba(${line}, 1)` })
    .to(worlds, { scaleY: 0.004, duration: 0.2, ease: "power2.in" })
    .to(from.el, { autoAlpha: 0, duration: 0.2, ease: "power2.in" }, "<")
    .set(from.el, { autoAlpha: 0 })
    .to(worlds, { scaleX: 0, duration: 0.12, ease: "power2.in" })
    .fromTo(...glow(60, 0.8, 0, 0, 0.12, "power2.in"))
    .set(to.el, { autoAlpha: 1 }, "+=0.15")
    .set(worlds, { filter: "brightness(3)" }, "<") // the new canvas opens bright, then settles
    .to(worlds, { scaleX: 1, duration: 0.22, ease: "power3.out" })
    .fromTo(...glow(0, 0.8, 60, 0.8, 0.22, "power3.out"))
    .to(worlds, { scaleY: 1, duration: 0.2, ease: "expo.in" })
    .fromTo(...glow(60, 0.8, 60, 0, 0.2, "expo.in"))
    .to(worlds, { backgroundColor: `rgba(${line}, 0)`, filter: "brightness(1)", duration: 0.7, ease: "power2.out" })
    .set(worlds, { clearProps: "transform,filter,backgroundColor" })
    .set(stage, { clearProps: "backgroundColor,backgroundImage" });
}
