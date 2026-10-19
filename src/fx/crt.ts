import { gsap } from "gsap";
import type { CanvasRuntime } from "../render/world";
import type { Ctx, StepAdder } from "../types";
import type { TransitionOpts } from "./transitions";

export interface CrtOpts {
  color?: "green" | "amber"; // default green
  lines: string[];
}
export interface CrtHandle {
  powerOn: StepAdder;
  type(tl: gsap.core.Timeline, line: number | "all"): void;
  ready: StepAdder;
}

const CPS = 34; // typing speed, characters per second (the spike's value)
const COUNT = 1.4; // seconds a memory line counts up
const PAUSE = 0.15; // between lines when typing them all
// A memory line ("MEMORY TEST: 640K OK") types its label, then counts up to the number in 16K steps.
const MEMORY = /^(.+?:\s*)(\d+)K( OK)?$/;

const duration = (full: string) => {
  const m = MEMORY.exec(full);
  return m ? m[1].length / CPS + COUNT : Math.max(0.1, full.length / CPS);
};

// The line's text at typing progress p. A plain line: the first round(p * len) characters.
export function typed(full: string, p: number): string {
  const m = MEMORY.exec(full);
  if (!m) return full.slice(0, Math.round(p * full.length));
  const [, label, num, ok = ""] = m;
  const split = label.length / CPS / duration(full);
  if (p < split) return label.slice(0, Math.round((p / split) * label.length));
  const k = Math.round((((p - split) / (1 - split)) * +num) / 16) * 16;
  return `${label}${String(Math.min(k, +num)).padStart(num.length, " ")}K${p >= 1 ? ok : ""}`;
}

// The spike's look, scoped to .k-retro (the only place monospace is allowed). Flicker and blink are
// CSS loops on leaf elements marked data-k-ignore, so the self-test snapshot skips them.
const CSS = `
.k-retro { position: absolute; inset: 0; background: var(--k-blackout); --k-crt: var(--k-phosphor); }
.k-retro .k-crt-screen { position: absolute; inset: 40px; border-radius: 60px / 50px; overflow: hidden;
  background: radial-gradient(ellipse at 50% 45%, color-mix(in srgb, var(--k-crt) 11%, #000) 0%, color-mix(in srgb, var(--k-crt) 5%, #000) 60%, #010201 100%); }
.k-retro .k-crt-term { position: absolute; left: 170px; top: 140px; right: 170px; font: 500 46px/1.5 "Cascadia Mono", Consolas, "Courier New", monospace;
  color: var(--k-crt); white-space: pre;
  text-shadow: 0 0 4px var(--k-crt), 0 0 18px color-mix(in srgb, var(--k-crt) 55%, transparent); }
.k-retro .k-crt-term > div { min-height: 1.5em; }
.k-retro .k-crt-cursor { display: inline-block; width: .6em; height: 1em; vertical-align: -0.12em;
  background: var(--k-crt); box-shadow: 0 0 14px var(--k-crt); animation: k-crt-blink 1s infinite steps(1); }
.k-retro .k-crt-scan { position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(to bottom, rgba(0,0,0,.32) 0 2px, transparent 2px 4px);
  animation: k-crt-flicker 3.2s infinite steps(1); }
.k-retro .k-crt-vignette { position: absolute; inset: 0; pointer-events: none; border-radius: inherit;
  background: radial-gradient(ellipse at 30% 18%, rgba(255,255,255,.07), transparent 40%), radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,.75) 100%);
  box-shadow: inset 0 0 120px 30px rgba(0,0,0,.85); }
.k-retro .k-crt-beam { position: absolute; inset: 40px; border-radius: 60px / 50px; background: #fff;
  box-shadow: 0 0 60px 20px color-mix(in srgb, var(--k-crt) 60%, #fff); }
@keyframes k-crt-blink { 50% { opacity: 0; } }
@keyframes k-crt-flicker { 0% { opacity: 1; } 31% { opacity: .82; } 33% { opacity: 1; } 67% { opacity: .9; } 69% { opacity: 1; } }
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
  const root = div(ctx.html, "k-retro");
  if (opts.color === "amber") root.style.setProperty("--k-crt", "var(--k-phosphor-amber)");
  const screen = div(root, "k-crt-screen");
  const term = div(screen, "k-crt-term");
  const lineEls = opts.lines.map(() => {
    const e = div(term, "");
    e.dataset.kText = "";
    return e;
  });
  const ready = div(term, "");
  ready.append("READY.", document.createElement("br"));
  div(ready, "k-crt-cursor").setAttribute("data-k-ignore", "");
  div(screen, "k-crt-scan").setAttribute("data-k-ignore", "");
  div(screen, "k-crt-vignette");
  const beam = div(root, "k-crt-beam");
  gsap.set([root, screen, beam, ready], { autoAlpha: 0 });

  const typeLine = (tl: gsap.core.Timeline, i: number, at?: string) => {
    const full = opts.lines[i];
    if (full === undefined) throw new Error(`crt: no line ${i} (${opts.lines.length} lines)`);
    const e = lineEls[i];
    tl.to(
      {},
      {
        duration: duration(full),
        ease: "none",
        onUpdate(this: gsap.core.Tween) {
          e.textContent = typed(full, this.progress());
        },
      },
      at,
    );
  };

  return {
    // The spike's power-on: a line flashes across, opens to a white screen, which fades to the glowing terminal.
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
      if (line === "all") opts.lines.forEach((_, i) => typeLine(tl, i, i ? `+=${PAUSE}` : undefined));
      else typeLine(tl, line);
    },
    ready(tl) {
      tl.fromTo(ready, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, immediateRender: false });
    },
  };
}

// The old canvas collapses to a bright line and a dot, then a line flashes across and opens into the new canvas.
// It squashes the layer that holds all canvases, so each canvas keeps its own camera pose.
export function transitionCrt(
  from: CanvasRuntime,
  to: CanvasRuntime,
  opts: TransitionOpts & { color?: "green" | "amber" },
): gsap.core.Timeline {
  const worlds = from.el.parentElement!;
  const stage = worlds.parentElement!;
  const token = opts.color === "amber" ? "--k-phosphor-amber" : "--k-phosphor";
  // The flash: the phosphor colour mixed 70 % toward white. GSAP tweens rgba, not var() or color-mix().
  const [r, g, b] = gsap.utils.splitColor(getComputedStyle(stage).getPropertyValue(token).trim() || "#fff") as number[];
  const mix = (c: number) => Math.round(c + (255 - c) * 0.7);
  const rgb = `${mix(r)}, ${mix(g)}, ${mix(b)}`;
  return gsap
    .timeline()
    .set(stage, { backgroundColor: "var(--k-blackout)" })
    .set(to.el, { autoAlpha: 0 })
    .to(worlds, { scaleY: 0.004, filter: "brightness(3)", duration: 0.2, ease: "power2.in" })
    .set(worlds, { backgroundColor: `rgba(${rgb}, 1)` })
    .set(from.el, { autoAlpha: 0 })
    .to(worlds, { scaleX: 0, duration: 0.12, ease: "power2.in" })
    .set(to.el, { autoAlpha: 1 }, "+=0.15")
    .to(worlds, { scaleX: 1, duration: 0.22, ease: "power3.out" })
    .to(worlds, { scaleY: 1, duration: 0.2, ease: "expo.in" })
    .to(worlds, { backgroundColor: `rgba(${rgb}, 0)`, filter: "brightness(1)", duration: 0.7, ease: "power2.out" })
    .set(worlds, { clearProps: "transform,filter,backgroundColor" })
    .set(stage, { clearProps: "backgroundColor" });
}
