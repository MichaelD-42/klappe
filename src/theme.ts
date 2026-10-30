import calm from "./themes/calm.css?raw";
import type { Deck } from "./types";

// Motion tokens in seconds, except autoHoldMs. Read them when a step is built, not at import: setTempo scales them.
const BASE = { camera: 1.6, step: 0.6, autoHoldMs: 2500 };
export const motion = { ...BASE };
// deck.md tempo, set once at load before anything builds: a factor on all three.
export const setTempo = (k: number) => void Object.assign(motion, { camera: BASE.camera * k, step: BASE.step * k, autoHoldMs: BASE.autoHoldMs * k });

// CSS variables defined in themes/calm.css.
export const cssVars = { bg: "--k-bg", fg: "--k-fg", accent: "--k-accent", font: "--k-font" };

/** The `--k-*` declarations of the :root block. */
export function parseTokens(css: string): Record<string, string> {
  const root = /:root\s*\{([^}]*)\}/.exec(css.replace(/\/\*[\s\S]*?\*\//g, ""));
  return Object.fromEntries([...(root?.[1] ?? "").matchAll(/(--k-[\w-]+)\s*:\s*([^;]+);?/g)].map((m) => [m[1], m[2].trim()]));
}

const rgb = (c: string): [number, number, number] => {
  const h = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(c.trim())?.[1];
  if (h) {
    const f = h.length === 3 ? [...h].map((x) => x + x).join("") : h;
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) as [number, number, number];
  }
  const n = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(c.trim());
  if (!n) throw new Error(`unsupported colour: ${c}`);
  return [+n[1], +n[2], +n[3]];
};
const lum = (c: string) => {
  const [r, g, b] = rgb(c).map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio of two colours (#rgb, #rrggbb or rgb()). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
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
  for (const [fg, bg, min] of CHECKS) {
    const [a, b] = [read(fg, "color"), read(bg, "backgroundColor")];
    let c: number;
    try {
      c = contrast(a, b);
    } catch {
      // oklch(), color-mix() and color() are serialised in their own space; not measured.
      problems.push(`theme: ${/^rgb/.test(a) ? bg : fg} not a readable colour (${/^rgb/.test(a) ? b : a})`);
      continue;
    }
    if (c < min) problems.push(`theme: ${fg} on ${bg} contrast ${c.toFixed(1)} < ${min}`);
  }
  probe.remove();
  return problems;
}
