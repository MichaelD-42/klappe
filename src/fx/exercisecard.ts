import { gsap } from "gsap";
import type { IconNode } from "lucide";
import { t } from "../strings";
import type { Ctx, StepAdder } from "../types";
import { iconGlyph } from "./icons";

export interface ExerciseCardOpts {
  title: string;
  tasks: string[]; // shown with the card, numbered
  extras?: string[]; // optional items, hidden until extra(i) reveals them
  minutes?: number; // the time box, shown as "15 min"
  group?: string; // who works together, e.g. "pairs", shown as written
  x: number;
  y: number;
  w: number;
  h?: number; // with h, the card shrinks to fit it, down to the floor, then reports a problem
}
export interface ExerciseCardHandle {
  el: HTMLElement; // the card's block, for a scene that places or moves it
  show: StepAdder; // the card with its title, time, group and tasks
  extra(i: number): StepAdder; // reveals optional item i
}

// Lucide "clock" and "users" (ISC), inline: src/fx is not scanned for icon names, and importing "lucide" would pull every icon in dev.
const CLOCK: IconNode = [["circle", { cx: "12", cy: "12", r: "10" }], ["path", { d: "M12 6v6l4 2" }]];
const USERS: IconNode = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
  ["path", { d: "M16 3.128a4 4 0 0 1 0 7.744" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }],
  ["circle", { cx: "9", cy: "7", r: "4" }],
];
const FLOOR = 20; // legibility floor for the smallest text, scene px (14.2 px at 1366)
const MAX_FONT = 36;

const div = (parent: HTMLElement, style: Partial<CSSStyleDeclaration>, text?: string) => {
  const e = parent.appendChild(document.createElement("div"));
  Object.assign(e.style, style);
  if (text !== undefined) e.textContent = text;
  return e;
};

// An exercise card on --k-surface: the title, a meta line (clock and time box, people and group) in --k-muted,
// the numbered tasks, then optional items with a "+" in --k-accent that extra(i) reveals one per step.
// Reduced motion: an extra fades in without the slide.
export function exerciseCard(ctx: Ctx, opts: ExerciseCardOpts): ExerciseCardHandle {
  const root = document.createElement("div");
  Object.assign(root.style, {
    position: "absolute", left: `${opts.x}px`, top: `${opts.y}px`, width: `${opts.w}px`, boxSizing: "border-box", padding: "1.2em 1.4em",
    background: "var(--k-surface)", border: "2px solid var(--k-line)", borderRadius: "16px", color: "var(--k-fg)",
    font: `400 ${MAX_FONT}px/1.3 var(--k-font)`, display: "flex", flexDirection: "column", gap: "0.6em", zIndex: "2",
  });
  div(root, { fontSize: "1.35em", fontWeight: "700", overflowWrap: "anywhere" }, opts.title);
  const meta: [IconNode, string][] = [];
  if (opts.minutes !== undefined) meta.push([CLOCK, `${opts.minutes} ${t("min", ctx.deck.lang)}`]);
  if (opts.group) meta.push([USERS, opts.group]);
  if (meta.length) {
    const line = div(root, { display: "flex", flexWrap: "wrap", gap: "0.4em 1.4em", color: "var(--k-muted)", fontWeight: "600" });
    for (const [node, text] of meta) {
      const m = div(line, { display: "flex", alignItems: "center", gap: "0.4em" });
      div(m, { width: "1.1em", height: "1.1em", flex: "none" }).innerHTML =
        `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconGlyph(node, ctx.problem)}</svg>`;
      div(m, {}, text);
    }
  }
  const list = div(root, { display: "flex", flexDirection: "column", gap: "0.4em", borderTop: "1px solid var(--k-line)", paddingTop: "0.6em" });
  const item = (marker: string, color: string, text: string) => {
    const row = div(list, { display: "flex", gap: "0.6em", alignItems: "baseline" });
    div(row, { color, fontWeight: "700", minWidth: "1.2em", flex: "none" }, marker);
    div(row, { minWidth: "0", overflowWrap: "anywhere" }, text);
    return row;
  };
  opts.tasks.forEach((s, i) => item(`${i + 1}.`, "var(--k-muted)", s));
  const extras = (opts.extras ?? []).map((s) => item("+", "var(--k-accent)", s));
  ctx.html.append(root);
  gsap.set(root, { autoAlpha: 0 });
  if (extras.length) gsap.set(extras, { autoAlpha: 0, y: 0 }); // GSAP warns on an empty target list

  let fits: boolean | undefined;
  const fit = () => {
    if (fits !== undefined) return fits;
    let size = MAX_FONT;
    const over = () => opts.h !== undefined && root.offsetHeight > opts.h;
    for (; size > FLOOR; size -= 2) {
      root.style.fontSize = `${size}px`;
      if (!over()) break;
    }
    root.style.fontSize = `${size}px`;
    fits = !over();
    if (!fits) ctx.problem(`exerciseCard: "${opts.title}" does not fit ${opts.h}px at ${FLOOR}px text`);
    return fits;
  };

  return {
    el: root,
    show: (tl) => {
      const at = tl.duration();
      if (!fit()) return void tl.set({}, {}, at + 0.4);
      tl.to(root, { autoAlpha: 1, duration: 0.4 }, at);
    },
    extra: (i) => (tl) => {
      const at = tl.duration();
      const e = extras[i];
      if (!e) ctx.problem(`exerciseCard: no extra ${i}`);
      if (!e || !fit()) return void tl.set({}, {}, at + 0.4);
      tl.fromTo(e, { autoAlpha: 0, y: ctx.reducedMotion ? 0 : 16 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out", immediateRender: false }, at);
    },
  };
}
