import { gsap } from "gsap";
import type { CanvasRuntime } from "./render/world";
import { formatHash } from "./router";
import type { Stepper } from "./stepper";
import { t } from "./strings";
import { motion } from "./theme";
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
// under it. GSAP writes SVG transforms to the attribute, so that is recorded too. Effects that write
// from onUpdate mark their output: data-k-text (its text) and data-k-progress (a progress value).
// Decoration outside the timeline (CSS loops, video) sits under data-k-ignore and is left out.
export function snapshot(c: CanvasRuntime): string {
  const pose = ["x", "y", "scaleX", "scaleY"].map((p) => `${p}=${gsap.getProperty(c.el, p)}`).join(" ");
  const lines = [`world|${round(pose)}`];
  for (const e of c.el.querySelectorAll<HTMLElement | SVGElement>("[style], [transform], [data-k-text], [data-k-progress]")) {
    if (e.closest("[data-k-ignore]")) continue;
    const s = e.style;
    const attr = e.getAttribute("transform") ?? "";
    const progress = e.getAttribute("data-k-progress") ?? "";
    const text = e.hasAttribute("data-k-text") ? `|text=${e.textContent}` : "";
    lines.push(`${path(e, c.el)}|${round(`${s.opacity}|${s.visibility}|${s.transform}|${attr}|${progress}`)}${text}`);
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
// Section text (a backdrop for the whole canvas) is checked for size where it shows on stage.
function legibility(c: CanvasRuntime, scene: string, stage: HTMLElement): string[] {
  const fit = stage.getBoundingClientRect().width / 1920;
  const cam = Number(gsap.getProperty(c.el, "scaleX"));
  const box = stage.getBoundingClientRect();
  const bad: string[] = [];
  const seen = new Set<Element>();
  const roots = [
    ...[...c.el.querySelectorAll(`[data-scene="${CSS.escape(scene)}"]`)].map((r) => ({ r, section: false })),
    ...[...c.el.querySelectorAll("[data-section]")].map((r) => ({ r, section: true })),
  ];
  for (const { r: root, section } of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const e = t.parentElement;
      if (!e || seen.has(e) || !t.textContent?.trim()) continue;
      seen.add(e);
      if (!e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const px = parseFloat(getComputedStyle(e).fontSize) * cam * fit;
      const r = e.getBoundingClientRect();
      const outside = r.left < box.left - 1 || r.top < box.top - 1 || r.right > box.right + 1 || r.bottom > box.bottom + 1;
      const offStage = r.right <= box.left || r.left >= box.right || r.bottom <= box.top || r.top >= box.bottom;
      if (section && offStage) continue;
      const where = `${path(e, c.el)} "${t.textContent.trim().slice(0, 30)}"`;
      if (innerWidth === 1366 && px < MIN_PX_1366) bad.push(`${where}: ${px.toFixed(1)} px < ${MIN_PX_1366} px`);
      if (!section && outside) bad.push(`${where}: box ${[r.left, r.top, r.right, r.bottom].map(Math.round)} outside stage`);
    }
  }
  return bad;
}

async function walk(ctx: SelftestCtx, checks: SelftestCheck[]): Promise<void> {
  const { stepper, canvases, steps, stage } = ctx;
  const reset = () => {
    for (const c of canvases) {
      c.tl.seek(0, false); // fire onUpdate, as a fresh page load would show it
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

const AC_SPEED = 50;
const AC_HOLD_MS = 50;
const CHECK_MS = 8000; // 9 checks: worst case 72 s, under the driver's 90 s

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Polls, so it also covers state no engine event reports (the speaker iframe's text).
async function until(cond: () => boolean, ms = 2000): Promise<boolean> {
  for (const end = performance.now() + ms; !cond(); await sleep(10)) if (performance.now() > end) return false;
  return true;
}

// The milestone 1 acceptance criteria (spec §9) on the demo deck, as checks AC-1..AC-8 and History.
// Each check returns its failures; a throw or a timeout is a failure too, so every check reports.
async function acceptance(ctx: SelftestCtx, checks: SelftestCheck[]): Promise<void> {
  const { stepper, canvases, steps, stage } = ctx;
  const { deck, overview, selector, autoplay } = window.klappe;
  const log: { ev: string; data: any }[] = [];
  for (const ev of ["step", "transition", "end"] as const) stepper.on(ev, (data) => log.push({ ev, data }));
  const since = (n: number, ev: string) => log.slice(n).filter((e) => e.ev === ev).map((e) => e.data);

  const at = (i: number) => (i >= 0 ? `${i} ${formatHash(steps[i])}` : String(i));
  const lastOf = (section: string) => steps.map((a) => a.section).lastIndexOf(section);
  const sceneOf = (i: number) =>
    deck.sections.find((s: any) => s.id === steps[i].section)?.scenes.find((s: any) => s.id === steps[i].scene);
  const stepText = (i: number): string => sceneOf(i)?.steps[steps[i].step - 1]?.text ?? "";
  const pose = (el: HTMLElement) => ["x", "y", "scaleX", "scaleY"].map((p) => gsap.getProperty(el, p)).join(",");

  // A timed-out check runs on in the background. Its helpers throw once it is dead, so it stops
  // at its next wait or move and cannot act during the checks after it. Each check shadows the
  // outer stepper, until, sleep with these.
  const hold = motion.autoHoldMs;
  const helpers = (dead: () => boolean) => {
    const live = () => {
      if (dead()) throw new Error("check aborted after its timeout");
    };
    const wait = async <T>(f: () => Promise<T>): Promise<T> => {
      live();
      const r = await f();
      live();
      return r;
    };
    const waitUntil = (cond: () => boolean, ms?: number) => wait(() => until(() => dead() || cond(), ms));
    return {
      stepper: {
        get index() {
          return stepper.index;
        },
        goto: (i: number, how: "play" | "cut") => wait(() => stepper.goto(i, how)),
        next: () => wait(() => stepper.next()),
        prev: () => wait(() => stepper.prev()),
      },
      until: waitUntil,
      sleep: (ms: number) => wait(() => sleep(ms)),
      key: (k: string) => {
        live();
        document.body.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
      },
      reach: async (i: number, what: string, ms = 2000) =>
        (await waitUntil(() => stepper.index === i, ms)) ? "" : `${what}: at ${at(stepper.index)}, want ${at(i)}`,
    };
  };

  const check = async (name: string, fn: (h: ReturnType<typeof helpers>) => Promise<(string | false | undefined)[]>) => {
    let timer = 0;
    let dead = false;
    const run = fn(helpers(() => dead));
    run.catch(() => {}); // a dead check's abort throw is expected, not an unhandled rejection
    try {
      const timeout = new Promise<never>((_, no) => (timer = window.setTimeout(() => no(new Error(`timed out after ${CHECK_MS} ms`)), CHECK_MS)));
      const bad = (await Promise.race([run, timeout])).filter(Boolean);
      checks.push({ name, ok: !bad.length, detail: bad.join("; ") || undefined });
    } catch (e) {
      checks.push({ name, ok: false, detail: e instanceof Error ? e.message : String(e) });
    } finally {
      dead = true;
      clearTimeout(timer);
      overview.close();
      selector.close();
      autoplay.stop();
      motion.autoHoldMs = hold;
    }
  };

  await check("AC-1", async ({ stepper, reach }) => {
    await stepper.goto(0, "cut");
    const want = steps.findIndex((a) => a.section === "value-stream" && a.scene === "clarification" && a.step === 2);
    if (want < 0) return ["the demo deck has no #/value-stream/clarification/2"];
    location.hash = "#/value-stream/clarification/2";
    return [await reach(want, "deep link")];
  });

  await check("AC-2", async ({ stepper, key, reach }) => {
    await stepper.goto(0, "cut");
    key("ArrowRight");
    const right = await reach(1, "ArrowRight");
    key("ArrowLeft");
    const left = await reach(0, "ArrowLeft");
    stage.click();
    return [right, left, await reach(1, "click on the stage")];
  });

  await check("AC-3", async ({ stepper, until, reach }) => {
    await stepper.goto(0, "cut");
    const frame = document.createElement("iframe");
    Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "640px", height: "400px", border: "0" });
    const loaded = () => new Promise((r) => frame.addEventListener("load", r, { once: true }));
    let load = loaded();
    frame.src = "?speaker=1";
    document.body.append(frame);
    try {
      await load;
      const shows = (i: number) => frame.contentDocument?.querySelector(".k-sp-text")?.textContent === stepText(i);
      const bad = [!(await until(() => shows(0))) && "speaker on open: does not show step 0"];
      await stepper.next();
      bad.push(!(await until(() => shows(1), 1000)) && "next() in main: speaker text not updated within 1 s");
      const next = [...(frame.contentDocument?.querySelectorAll<HTMLElement>(".k-sp-buttons button") ?? [])].find(
        (b) => b.textContent === t("next", deck.meta.lang),
      );
      if (!next) return [...bad, "speaker has no Next button"];
      next.click();
      bad.push(await reach(2, "Next in the speaker", 1000));
      load = loaded();
      frame.contentWindow!.location.reload();
      await load;
      bad.push(!(await until(() => shows(stepper.index))) && "speaker after reload: does not show the current step");
      return bad;
    } finally {
      frame.remove();
    }
  });

  await check("AC-4", async ({ stepper, key, until }) => {
    await stepper.goto(0, "cut");
    key("o");
    if (!overview.isOpen) return ["O did not open the overview"];
    const tiles = document.querySelectorAll(".k-overlay .k-ov-thumb").length;
    const markers = [...document.querySelectorAll<HTMLElement>(".k-overlay .k-ov-marker")];
    const scenes = deck.sections.flatMap((s: any) => s.scenes);
    const title = scenes.find((s: any) => s.id === "analysis")?.title;
    const bad = [
      tiles !== canvases.length && `${tiles} tiles, want ${canvases.length} canvases`,
      markers.length !== scenes.length && `${markers.length} markers, want ${scenes.length} scenes`,
    ];
    const marker = markers.find((m) => m.textContent === title);
    if (!marker) return [...bad, `no marker for analysis ("${title}")`];
    marker.click();
    const landed = await until(() => steps[stepper.index]?.scene === "analysis");
    return [...bad, !landed && `marker click: at ${at(stepper.index)}, want scene analysis`, overview.isOpen && "overview still open"];
  });

  await check("AC-5", async ({ stepper }) => {
    const last = lastOf("opening");
    await stepper.goto(last, "cut");
    const n = log.length;
    await stepper.next();
    const fades = since(n, "transition").map((tr) => tr.kind);
    await stepper.prev();
    const shown = getComputedStyle(canvases[steps[last].canvas].el);
    const other = getComputedStyle(canvases[steps[last + 1].canvas].el);
    return [
      (fades.length !== 1 || fades[0] !== "fade") && `transitions on next(): [${fades}], want [fade]`,
      stepper.index !== last && `prev(): at ${at(stepper.index)}, want ${at(last)}`,
      (shown.opacity !== "1" || shown.visibility !== "visible") && "opening canvas not visible after prev()",
      other.visibility !== "hidden" && "value-stream canvas still visible after prev()",
    ];
  });

  await check("AC-6", async ({ stepper }) => {
    const last = lastOf("value-stream");
    const to = steps[last + 1];
    if (to?.section !== "global-team" || to.canvas !== steps[last].canvas)
      return ["the step after value-stream is not global-team on the same canvas"];
    await stepper.goto(last, "cut");
    const el = canvases[to.canvas].el;
    const before = pose(el);
    const n = log.length;
    await stepper.next();
    const kinds = since(n, "transition").map((tr) => tr.kind);
    return [
      stepper.index !== to.index && `next(): at ${at(stepper.index)}, want ${at(to.index)}`,
      kinds.length > 0 && `transitions [${kinds}], want none`,
      pose(el) === before && `world transform did not change (${before})`,
    ];
  });

  await check("AC-7", async ({ stepper, key, reach }) => {
    await stepper.goto(steps.length - 1, "cut"); // so each jump moves
    key("s");
    if (!selector.isOpen) return ["S did not open the selector"];
    const labels = () => [...document.querySelectorAll<HTMLElement>(".k-selector button")];
    const titles = labels().map((b) => b.textContent);
    const want = deck.sections.map((s: any) => s.title);
    const bad = [titles.join("|") !== want.join("|") && `buttons [${titles}], want [${want}]`];
    for (const [k, s] of deck.sections.entries()) {
      if (!selector.isOpen) key("s");
      labels()[k]?.click();
      bad.push(await reach(steps.findIndex((a) => a.section === s.id), `selector ${s.id}`));
      bad.push(selector.isOpen && `selector ${s.id}: still open`);
    }
    return bad;
  });

  await check("AC-8", async ({ stepper, until, sleep, key, reach }) => {
    const hold = motion.autoHoldMs;
    motion.autoHoldMs = AC_HOLD_MS;
    try {
      await stepper.goto(0, "cut");
      const n = log.length;
      autoplay.start();
      const ended = await until(() => since(n, "end").length > 0, CHECK_MS - 3000);
      const bad = [
        !ended && `auto-play did not reach the end (at ${at(stepper.index)})`,
        stepper.index !== steps.length - 1 && `auto-play ended at ${at(stepper.index)}, want ${at(steps.length - 1)}`,
        autoplay.running && "auto-play still running after the end",
      ];
      await stepper.goto(0, "cut");
      autoplay.start();
      key("ArrowRight");
      bad.push(autoplay.running && "ArrowRight did not stop auto-play");
      bad.push(await reach(1, "ArrowRight during auto-play"));
      await sleep(AC_HOLD_MS * 4); // a running auto-play would have stepped on by now
      bad.push(stepper.index !== 1 && `auto-play moved on after ArrowRight: at ${at(stepper.index)}`);
      return bad;
    } finally {
      motion.autoHoldMs = hold;
    }
  });

  await check("History", async ({ stepper, reach }) => {
    await stepper.goto(0, "cut");
    await stepper.next();
    await stepper.next();
    history.back();
    const back = await reach(1, "history.back()");
    history.forward();
    return [back, await reach(2, "history.forward()")];
  });
}

export async function runSelftestIfAsked(ctx: SelftestCtx): Promise<void> {
  const mode = new URLSearchParams(location.search).get("selftest");
  if (!mode) return;
  const checks: SelftestCheck[] = [];
  try {
    if (mode === "walk") await walk(ctx, checks);
    else if (mode === "ac") {
      await ctx.stepper.goto(0, "cut"); // let main's first move land
      gsap.globalTimeline.timeScale(AC_SPEED);
      try {
        await acceptance(ctx, checks);
      } finally {
        gsap.globalTimeline.timeScale(1);
      }
    }
    else checks.push({ name: `unknown selftest mode '${mode}'`, ok: false });
  } catch (e) {
    ctx.errors.push(`selftest: ${e instanceof Error ? e.message : e}`);
  }
  // Always write a result, so a failure reads as a failure and not as a driver timeout.
  const problems = [...ctx.problems, ...ctx.canvases.flatMap((c) => c.problems)];
  const result: SelftestResult = {
    mode,
    ok: checks.every((c) => c.ok) && !problems.length && !ctx.errors.length,
    steps: ctx.steps.length,
    checks,
    problems,
    errors: [...ctx.errors],
  };
  const out = document.createElement("script");
  out.type = "application/json";
  out.id = "klappe-selftest";
  out.textContent = JSON.stringify(result);
  document.body.append(out);
}
