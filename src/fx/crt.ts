import { gsap } from "gsap";
import type { CanvasRuntime } from "../render/world";
import type { Ctx, StepAdder } from "../types";
import type { TransitionOpts } from "./transitions";

// A boot line. { text: "MEMORY TEST: 640K OK", count: true } types its label, then counts up to the number.
export type CrtLine = string | { text: string; count?: true };
export interface CrtOpts {
  color?: "green" | "amber"; // default green
  lines: CrtLine[];
}
export interface CrtHandle {
  powerOn: StepAdder;
  type(tl: gsap.core.Timeline, line: number | "all"): void;
  ready: StepAdder;
}

const CPS = 34; // typing speed, characters per second (the spike's value)
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
const MAX_FONT = 46; // the spike's size
export const MIN_FONT = 20; // 14.2 px at 1366, the legibility floor
const LINE_H = 1.5;
const CHAR_W = 0.6; // monospace advance in em, a little wide for safety

// The largest font size up to 46 px at which rows x cols fit in w x h. fits: false when even MIN_FONT clips.
export function fitFont(rows: number, cols: number, w: number, h: number): { size: number; fits: boolean } {
  const size = Math.min(MAX_FONT, h / (rows * LINE_H), w / (Math.max(1, cols) * CHAR_W));
  return { size: Math.max(MIN_FONT, Math.floor(size)), fits: size >= MIN_FONT };
}

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
  for (const l of lines)
    if (l.count && !COUNTED.test(l.text))
      ctx.problem(`crt: count line "${l.text}" needs a label and a number with K, like "MEMORY TEST: 640K OK"`);
  const root = div(ctx.html, "k-retro");
  if (opts.color === "amber") root.style.setProperty("--k-crt", "var(--k-phosphor-amber)");
  const screen = div(root, "k-crt-screen");
  const term = div(screen, "k-crt-term");
  // Rows: the lines, READY. and the cursor row. Columns: the longest line plus the typing cursor.
  const fit = fitFont(lines.length + 2, Math.max(0, ...lines.map((l) => l.text.length)) + 1, ctx.rect.w - BOX.w, ctx.rect.h - BOX.h);
  if (!fit.fits) ctx.problem(`crt: ${lines.length} lines do not fit the screen even at ${MIN_FONT} px; shorten or split them`);
  term.style.fontSize = `${fit.size}px`;
  const lineEls = lines.map(() => {
    const e = div(term, "");
    e.dataset.kText = "";
    return e;
  });
  const ready = div(term, "");
  ready.append("READY.", document.createElement("br"));
  div(ready, "k-crt-cursor").setAttribute("data-k-ignore", "");
  div(screen, "k-crt-scan");
  div(screen, "k-crt-vignette");
  div(screen, "k-crt-flicker").setAttribute("data-k-ignore", "");
  const beam = div(root, "k-crt-beam");
  gsap.set([root, screen, beam, ready], { autoAlpha: 0 });
  // The beam's start pose is set at build too: a seek back before powerOn then writes the same transform as a fresh load.
  gsap.set(beam, { scaleX: 0, scaleY: 0.004 });

  const typeLine = (tl: gsap.core.Timeline, i: number, at?: string) => {
    const line = lines[i];
    if (!line) throw new Error(`crt: no line ${i} (${lines.length} lines)`);
    const e = lineEls[i];
    const m = line.count ? COUNTED.exec(line.text) : null; // a bad count line was reported and just types
    const textAt = m ? counted : typed;
    tl.to(
      {},
      {
        duration: m ? countDuration(m[1]) : Math.max(0.1, line.text.length / CPS),
        ease: "none",
        onUpdate(this: gsap.core.Tween) {
          const p = this.progress();
          e.textContent = textAt(line.text, p) + (p > 0 && p < 1 ? CURSOR : "");
        },
      },
      at,
    );
  };

  return {
    // The spike's power-on: a line flashes across, opens to a bright screen, which fades to the glowing terminal.
    powerOn(tl) {
      tl.set(root, { autoAlpha: 1 });
      tl.fromTo(beam, { scaleX: 0, scaleY: 0.004, autoAlpha: 1 }, { scaleX: 1, duration: 0.22, ease: "power3.out", immediateRender: false });
      tl.to(beam, { scaleY: 1, duration: 0.2, ease: "expo.in" });
      tl.set(screen, { autoAlpha: 1 });
      tl.to(beam, { autoAlpha: 0, duration: 0.7, ease: "power2.out" });
      tl.fromTo(
        screen,
        { filter: "brightness(2.2) blur(2px)" },
        { filter: "brightness(1) blur(0px)", duration: 1.1, ease: "power2.out", immediateRender: false },
        "<",
      );
    },
    type(tl, line) {
      if (line === "all") lines.forEach((_, i) => typeLine(tl, i, i ? `+=${PAUSE}` : undefined));
      else typeLine(tl, line);
    },
    ready(tl) {
      tl.fromTo(ready, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, immediateRender: false });
    },
  };
}

// The old canvas collapses to a bright line and a dot, then a line flashes across and opens into the new canvas.
// It squashes the layer that holds all canvases, so each canvas keeps its own camera pose. The glow around
// the line is a gradient on the stage behind that layer, so the squash does not flatten it.
export function transitionCrt(
  from: CanvasRuntime,
  to: CanvasRuntime,
  opts: TransitionOpts & { color?: "green" | "amber" },
): gsap.core.Timeline {
  const worlds = from.el.parentElement!;
  const stage = worlds.parentElement!;
  const token = opts.color === "amber" ? "--k-phosphor-amber" : "--k-phosphor";
  // GSAP tweens rgba, not var() or color-mix(), so the token is read and mixed here.
  const [r, g, b] = gsap.utils.splitColor(getComputedStyle(stage).getPropertyValue(token).trim() || "#fff") as number[];
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
    .to(worlds, { scaleY: 0.004, filter: "brightness(3)", duration: 0.2, ease: "power2.in" })
    .set(worlds, { backgroundColor: `rgba(${line}, 1)` })
    .set(from.el, { autoAlpha: 0 })
    .to(worlds, { scaleX: 0, duration: 0.12, ease: "power2.in" })
    .fromTo(...glow(60, 0.8, 0, 0, 0.12, "power2.in"))
    .set(to.el, { autoAlpha: 1 }, "+=0.15")
    .to(worlds, { scaleX: 1, duration: 0.22, ease: "power3.out" })
    .fromTo(...glow(0, 0.8, 60, 0.8, 0.22, "power3.out"))
    .to(worlds, { scaleY: 1, duration: 0.2, ease: "expo.in" })
    .fromTo(...glow(60, 0.8, 60, 0, 0.2, "expo.in"))
    .to(worlds, { backgroundColor: `rgba(${line}, 0)`, filter: "brightness(1)", duration: 0.7, ease: "power2.out" })
    .set(worlds, { clearProps: "transform,filter,backgroundColor" })
    .set(stage, { clearProps: "backgroundColor,backgroundImage" });
}
