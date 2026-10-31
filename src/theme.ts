import { contrast } from "./contrast";
import calm from "./themes/calm.css?raw";
import type { Deck, Rect } from "./types";

export { contrast };

// Motion tokens in seconds, except autoHoldMs. Read them when a step is built, not at import: setTempo scales them.
const BASE = { camera: 1.6, step: 0.6, autoHoldMs: 2500 };
export const motion = { ...BASE };
// deck.md tempo, set once at load before anything builds: a factor on all three.
export const setTempo = (k: number) => void Object.assign(motion, { camera: BASE.camera * k, step: BASE.step * k, autoHoldMs: BASE.autoHoldMs * k });

// The stage in scene px, from deck.md frame. Read it at use, not at import: setFrame sets it once at load, before anything builds.
export const stage = { w: 1920, h: 1080 };
export function setFrame(f: { w: number; h: number }): void {
  Object.assign(stage, f);
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--k-frame-w", `${f.w}px`);
  document.documentElement.style.setProperty("--k-frame-h", `${f.h}px`);
}

// The default safe area, top, right, bottom, left in scene px; deck.md safe-area overrides it.
export const SAFE_AREA: [number, number, number, number] = [48, 64, 48, 64];
// The safe area as a rect in the scene's own px (origin at the scene's top left), inside a frame of rect's size.
export const safeRect = (area: [number, number, number, number] = SAFE_AREA, rect: Rect): Rect => ({
  x: area[3],
  y: area[0],
  w: rect.w - area[1] - area[3],
  h: rect.h - area[0] - area[2],
});

// The element whose tokens JS-side readers (typeSize, gapPx, strokePx) resolve: the scene being built, so a section's
// `tokens` reach them; :root outside a build.
export let tokenRoot: Element | undefined;
export function withTokenRoot<T>(el: Element, fn: () => T): T {
  const was = tokenRoot;
  tokenRoot = el;
  try {
    return fn();
  } finally {
    tokenRoot = was;
  }
}

// CSS variables defined in themes/calm.css.
export const cssVars = { bg: "--k-bg", fg: "--k-fg", accent: "--k-accent", font: "--k-font" };

/** The `--k-*` declarations of the :root block. */
export function parseTokens(css: string): Record<string, string> {
  const root = /:root\s*\{([^}]*)\}/.exec(css.replace(/\/\*[\s\S]*?\*\//g, ""));
  return Object.fromEntries([...(root?.[1] ?? "").matchAll(/(--k-[\w-]+)\s*:\s*([^;]+);?/g)].map((m) => [m[1], m[2].trim()]));
}

/** Keys are `deck:<name>`, `repo:<name>` and `builtin:<name>`, checked in that order. */
export function resolveTheme(name: string, themes: Record<string, string>): { css: string; problem?: string } {
  for (const scope of ["deck", "repo", "builtin"]) {
    const css = themes[`${scope}:${name}`];
    if (css !== undefined) return { css };
  }
  return { css: calm, problem: `theme "${name}" not found; using calm` };
}

const CHECKS: [string, string, number][] = [
  ["--k-fg", "--k-bg", 4.5],
  ["--k-fg", "--k-surface", 4.5],
  ["--k-muted", "--k-bg", 4.5],
  ["--k-muted", "--k-surface", 4.5],
  ["--k-accent", "--k-bg", 3],
  ["--k-accent", "--k-surface", 3],
  ["--k-line", "--k-bg", 3],
];

// Loads the faces the theme's --k-font, --k-font-heading and --k-font-code name: effects measure text while they build.
// A font that is not installed or declared falls back as CSS does; a bad token value is a deck problem.
export async function loadFonts(): Promise<string[]> {
  const root = getComputedStyle(document.documentElement);
  try {
    // An empty token (a theme without a heading face) would make an invalid font shorthand: skip it.
    const families = ["--k-font", "--k-font-heading", "--k-font-code"].map((v) => root.getPropertyValue(v).trim()).filter(Boolean);
    await Promise.all(families.map((f) => document.fonts.load(`16px ${f}`)));
    return [];
  } catch (e) {
    return [`theme: fonts did not load (${e instanceof Error ? e.message : e})`];
  }
}

/** Injects calm, then the chosen theme (after it, so missing tokens fall back), then moves deck.css last; returns problems. */
export function applyTheme(deck: Deck, override?: string | null): string[] {
  const name = override || deck.meta.theme;
  const { css, problem } = resolveTheme(name, deck.themes ?? {});
  document.querySelectorAll("style[data-k-theme]").forEach((s) => s.remove());
  for (const text of css === calm ? [calm] : [calm, css]) {
    const s = document.createElement("style");
    s.dataset.kTheme = "";
    s.textContent = text;
    document.head.append(s);
  }
  // A deck's deck.css (fonts, classes, token overrides) loads after the theme, and the contrast check sees it.
  document.head.append(...document.querySelectorAll("style[data-k-deck-css]"));
  const problems = problem ? [problem] : [];
  const probe = document.body.appendChild(document.createElement("div"));
  const read = (v: string, prop: "color" | "backgroundColor") => {
    probe.style[prop] = `var(${v})`;
    return getComputedStyle(probe)[prop];
  };
  // The deck's theme, then each section's overrides on top: only the pairs that touch an overridden token.
  const measure = (label: string, only?: string[]) => {
    for (const [fg, bg, min] of CHECKS) {
      if (only && !only.includes(fg) && !only.includes(bg)) continue;
      const [a, b] = [read(fg, "color"), read(bg, "backgroundColor")];
      let c: number;
      try {
        c = contrast(a, b);
      } catch {
        // oklch(), color-mix() and color() are serialised in their own space; not measured.
        problems.push(`theme: ${label}${/^rgb/.test(a) ? bg : fg} not a readable colour (${/^rgb/.test(a) ? b : a})`);
        continue;
      }
      if (c < min) problems.push(`theme: ${label}${fg} on ${bg} contrast ${c.toFixed(1)} < ${min}`);
    }
  };
  measure("");
  for (const s of deck.sections) {
    const tokens = s.module?.tokens ?? {};
    for (const [k, v] of Object.entries(tokens)) k.startsWith("--k-") && probe.style.setProperty(k, v);
    if (Object.keys(tokens).length) measure(`section ${s.id}: `, Object.keys(tokens));
    probe.removeAttribute("style");
  }
  probe.remove();
  return problems;
}
