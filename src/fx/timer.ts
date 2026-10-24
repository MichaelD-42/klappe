import { gsap } from "gsap";
import { t } from "../strings";
import type { Ctx, StepAdder } from "../types";

export interface TimerOpts {
  minutes: number;
  style: "bar" | "donut" | "ring" | "text";
  x: number;
  y: number;
  size: number;
  label?: string;
}
export interface TimerHandle {
  show: StepAdder;
}

const SVG = "http://www.w3.org/2000/svg";
const PHASE = { run: "var(--k-accent)", warn: "var(--k-warn)", done: "var(--k-bad)" };

// The countdown at elapsedMs: the last 20% warns, zero is done. Seconds round up, so 0:00 shows only at the end.
export function timerState(totalMs: number, elapsedMs: number): { remainingMs: number; phase: "run" | "warn" | "done"; text: string } {
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const s = Math.ceil(remainingMs / 1000);
  const phase = remainingMs <= 0 ? "done" : remainingMs <= 0.2 * totalMs ? "warn" : "run";
  return { remainingMs, phase, text: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` };
}

const svgEl = (parent: Element, tag: string, attrs: Record<string, string | number>) => {
  const e = parent.appendChild(document.createElementNS(SVG, tag));
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e as SVGElement;
};

// The one wall-clock element: the fade-in is on tl, the countdown runs on requestAnimationFrame and
// performance.now, under data-k-ignore so the self-test snapshot leaves it out. size is the width, scene px.
export function timer(ctx: Ctx, opts: TimerOpts): TimerHandle {
  const { size, style } = opts;
  const total = opts.minutes * 60000;
  const root = document.createElement("div");
  root.setAttribute("data-k-ignore", "");
  root.setAttribute("data-no-advance", ""); // a click toggles the timer instead of stepping
  root.setAttribute("data-k-timer", "");
  Object.assign(root.style, {
    position: "absolute", left: `${opts.x}px`, top: `${opts.y}px`, width: `${size}px`, display: "flex", flexDirection: "column",
    alignItems: "center", gap: "12px", font: "600 28px/1.2 var(--k-font)", color: "var(--k-fg)", cursor: "pointer", zIndex: "2",
  });

  // The graphic, with mm:ss over its centre (ring, donut), under it (bar) or alone (text).
  const box = root.appendChild(document.createElement("div"));
  Object.assign(box.style, { position: "relative", width: `${size}px`, display: "flex", alignItems: "center", justifyContent: "center" });
  const clock = document.createElement("div");
  clock.setAttribute("data-k-timer-text", "");
  Object.assign(clock.style, { fontVariantNumeric: "tabular-nums", lineHeight: "1" });
  let fill: SVGElement | undefined;
  let setFrac = (_f: number) => {};
  if (style === "bar") {
    const h = Math.max(24, Math.round(size * 0.05));
    const svg = svgEl(box, "svg", { width: size, height: h, viewBox: `0 0 ${size} ${h}` });
    svgEl(svg, "rect", { width: size, height: h, rx: h / 2 }).style.fill = "var(--k-line)";
    fill = svgEl(svg, "rect", { width: size, height: h, rx: h / 2 });
    setFrac = (f) => fill!.setAttribute("width", String(size * f));
    root.append(clock);
    clock.style.fontSize = `${Math.max(32, size * 0.08)}px`;
  } else if (style === "text") {
    box.append(clock);
    clock.style.fontSize = `${size / 3}px`; // "10:00" in tabular figures fills about the width
  } else {
    const sw = style === "donut" ? size * 0.14 : Math.max(6, size * 0.03);
    const c = size / 2;
    const svg = svgEl(box, "svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}` });
    const circle = { cx: c, cy: c, r: c - sw / 2, fill: "none", "stroke-width": sw };
    svgEl(svg, "circle", circle).style.stroke = "var(--k-line)";
    // pathLength 1: the dash length is the fraction left; starts at 12 o'clock and empties clockwise from there.
    fill = svgEl(svg, "circle", { ...circle, pathLength: 1, transform: `rotate(-90 ${c} ${c})` });
    setFrac = (f) => fill!.setAttribute("stroke-dasharray", `${f} 1`);
    Object.assign(clock.style, { position: "absolute", fontSize: `${size * (style === "donut" ? 0.2 : 0.24)}px` });
    box.append(clock);
  }
  const line = (text = "") => {
    const d = root.appendChild(document.createElement("div"));
    d.textContent = text;
    Object.assign(d.style, { fontSize: `${Math.max(24, Math.min(40, size * 0.07))}px`, textAlign: "center" });
    return d;
  };
  if (opts.label) line(opts.label);
  const hint = line();
  hint.setAttribute("data-k-timer-hint", "");
  ctx.html.append(root);
  gsap.set(root, { autoAlpha: 0 });

  let elapsed = 0;
  let since = 0;
  let raf = 0; // the frame loop's id, 0 while stopped
  let start = Infinity; // the show step's start on tl
  let timeline: gsap.core.Timeline | undefined;
  let here = false; // the current step is this scene's, at or after the show step
  const draw = () => {
    const s = timerState(total, elapsed);
    const colour = PHASE[s.phase];
    clock.textContent = s.text;
    clock.style.color = colour;
    if (fill) fill.style[style === "bar" ? "fill" : "stroke"] = colour;
    setFrac(s.remainingMs / total);
    hint.textContent = s.phase === "done" ? t("timesUp", ctx.deck.lang) : !raf && !elapsed ? t("pressT", ctx.deck.lang) : "";
    hint.style.color = s.phase === "done" ? "var(--k-bad)" : "var(--k-muted)";
    return s;
  };
  const count = () => {
    const now = performance.now();
    if (timeline!.time() >= start) elapsed += now - since; // the count waits out a camera flight before the timer shows
    since = now;
  };
  const tick = () => {
    count();
    raf = draw().phase === "done" ? 0 : requestAnimationFrame(tick);
  };
  const run = () => {
    if (raf) return;
    since = performance.now();
    raf = requestAnimationFrame(tick);
    draw();
  };
  const pause = () => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      count();
    }
    draw();
  };
  const reset = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    elapsed = 0;
    draw();
  };
  const toggle = () => {
    if (!here) return;
    if (draw().phase === "done") reset();
    else if (raf) pause();
    else run();
  };
  draw();
  document.addEventListener("klappe:timer", toggle);
  root.addEventListener("click", toggle);
  ctx.onStep(({ play, span, scene }) => {
    here = scene === ctx.scene && !!span && span[1] > start;
    if (!here) return reset(); // another scene, or a step before the timer shows
    // Its own step played starts it; a cut onto it, or within the scene, leaves it as it is (reset: full, paused).
    if (play && span![0] <= start && start < span![1]) {
      reset();
      run();
    }
  });

  return {
    show: (tl) => {
      start = tl.duration();
      timeline = tl;
      tl.to(root, { autoAlpha: 1, duration: 0.4 }, start);
    },
  };
}
