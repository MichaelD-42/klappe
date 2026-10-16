import { gsap } from "gsap";
import type { CanvasRuntime } from "./render/world";
import { formatHash } from "./router";
import type { Stepper } from "./stepper";
import type { SelftestCheck, SelftestResult, StepAddr } from "./types";

export interface SelftestCtx {
  stepper: Stepper;
  canvases: CanvasRuntime[];
  steps: StepAddr[];
  stage: HTMLElement;
  problems: string[];
  errors: string[];
}

const PLAY_SPEED = 20;
const MIN_PX_1366 = 14;

const round = (s: string) => s.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (n) => String(Math.round(+n * 100) / 100 || 0));

function path(e: Element, root: Element): string {
  const parts: string[] = [];
  for (let n = e; n !== root && n.parentElement; n = n.parentElement)
    parts.unshift(`${n.tagName.toLowerCase()}:${[...n.parentElement.children].indexOf(n)}`);
  return parts.join(">");
}

// One line per element: the world camera pose, then every inline-styled or SVG-transformed element
// under it. GSAP writes SVG transforms to the attribute, so that is recorded too.
export function snapshot(c: CanvasRuntime): string {
  const pose = ["x", "y", "scaleX", "scaleY"].map((p) => `${p}=${gsap.getProperty(c.el, p)}`).join(" ");
  const lines = [`world|${round(pose)}`];
  for (const e of c.el.querySelectorAll<HTMLElement | SVGElement>("[style], [transform]")) {
    const s = e.style;
    const attr = e.getAttribute("transform") ?? "";
    lines.push(`${path(e, c.el)}|${round(`${s.opacity}|${s.visibility}|${s.transform}|${attr}`)}`);
  }
  return lines.join("\n");
}

// Which canvas shows. A play awaits its crossfade, so this must match the cut.
const shown = (canvases: CanvasRuntime[]) =>
  canvases.map((c, k) => `canvas ${k}|${round(`${c.el.style.opacity}|${c.el.style.visibility}`)}`).join("\n");

function firstDiff(a: string, b: string): string {
  const [x, y] = [a.split("\n"), b.split("\n")];
  for (let k = 0; k < Math.max(x.length, y.length); k++)
    if (x[k] !== y[k]) return `play "${x[k] ?? "(none)"}" vs seek "${y[k] ?? "(none)"}"`;
  return "";
}

// Every element with visible own text in the current scene: rendered size and on-stage box.
// Earlier scenes on the same canvas keep their text, off camera, so they are not checked.
function legibility(c: CanvasRuntime, scene: string, stage: HTMLElement): string[] {
  const fit = stage.getBoundingClientRect().width / 1920;
  const cam = Number(gsap.getProperty(c.el, "scaleX"));
  const box = stage.getBoundingClientRect();
  const bad: string[] = [];
  const seen = new Set<Element>();
  for (const root of c.el.querySelectorAll(`[data-scene="${CSS.escape(scene)}"]`)) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const e = t.parentElement;
      if (!e || seen.has(e) || !t.textContent?.trim()) continue;
      seen.add(e);
      if (!e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const px = parseFloat(getComputedStyle(e).fontSize) * cam * fit;
      const r = e.getBoundingClientRect();
      const where = `${path(e, c.el)} "${t.textContent.trim().slice(0, 30)}"`;
      if (innerWidth === 1366 && px < MIN_PX_1366) bad.push(`${where}: ${px.toFixed(1)} px < ${MIN_PX_1366} px`);
      if (r.left < box.left - 1 || r.top < box.top - 1 || r.right > box.right + 1 || r.bottom > box.bottom + 1)
        bad.push(`${where}: box ${[r.left, r.top, r.right, r.bottom].map(Math.round)} outside stage`);
    }
  }
  return bad;
}

async function walk(ctx: SelftestCtx, checks: SelftestCheck[]): Promise<void> {
  const { stepper, canvases, steps, stage } = ctx;
  const reset = () => {
    for (const c of canvases) {
      c.tl.seek(0);
      gsap.set(c.el, { autoAlpha: 0 });
    }
    stepper.reset();
  };
  const active = (i: number) => canvases[steps[i].canvas];
  const state = (i: number) => `${shown(canvases)}\n${snapshot(active(i))}`;

  await stepper.goto(0, "cut"); // let main's first move land before resetting
  reset();
  const played: string[] = [];
  gsap.globalTimeline.timeScale(PLAY_SPEED);
  try {
    for (let i = 0; i < steps.length; i++) {
      await stepper.next();
      played.push(state(i));
    }
  } finally {
    gsap.globalTimeline.timeScale(1);
  }

  for (let i = 0; i < steps.length; i++) {
    reset();
    await stepper.goto(i, "cut");
    const hash = formatHash(steps[i]);
    const diff = firstDiff(played[i], state(i));
    checks.push({ name: `step ${hash}: ${diff ? "play≠seek" : "play=seek"}`, ok: !diff, detail: diff || undefined });
    const bad = legibility(active(i), steps[i].scene, stage);
    checks.push({ name: `step ${hash}: legible`, ok: !bad.length, detail: bad.join("; ") || undefined });
  }
}

export async function runSelftestIfAsked(ctx: SelftestCtx): Promise<void> {
  const mode = new URLSearchParams(location.search).get("selftest");
  if (!mode) return;
  const checks: SelftestCheck[] = [];
  try {
    if (mode === "walk") await walk(ctx, checks);
    else checks.push({ name: `unknown selftest mode '${mode}'`, ok: false });
  } catch (e) {
    ctx.errors.push(`selftest: ${e instanceof Error ? e.message : e}`);
  }
  // Always write a result, so a failure reads as a failure and not as a driver timeout.
  const result: SelftestResult = {
    mode,
    ok: checks.every((c) => c.ok) && !ctx.problems.length && !ctx.errors.length,
    steps: ctx.steps.length,
    checks,
    problems: [...ctx.problems],
    errors: [...ctx.errors],
  };
  const out = document.createElement("script");
  out.type = "application/json";
  out.id = "klappe-selftest";
  out.textContent = JSON.stringify(result);
  document.body.append(out);
}
