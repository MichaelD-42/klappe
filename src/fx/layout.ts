import { tokenRoot } from "../theme";

// The layout tokens' defaults (calm.css). An effect writes its sizes as drawn at these.
const RADIUS = 12;
const STROKE = 4;
const GAP = 8;

// A corner radius, a stroke width or a gap in CSS: px as drawn at the default, times the theme's token over its default
// (--k-radius: 0px makes every box square, --k-stroke: 6px makes a 4 px line 6).
export const radius = (px: number): string => `calc(var(--k-radius) * ${px / RADIUS})`;
export const strokeW = (px: number): string => `calc(var(--k-stroke) * ${px / STROKE})`;
export const gapCss = (px: number): string => `calc(var(--k-gap) * ${px / GAP})`;

// The same for geometry computed in JS: px scaled by the resolved token. Read from :root, where themes and deck.css set
// them, or on the scene being built for a section's `tokens`; without a DOM (unit tests) px is kept.
const scaled = (name: string, base: number, px: number): number => {
  const el = typeof getComputedStyle === "undefined" ? undefined : (tokenRoot ?? globalThis.document?.documentElement);
  const v = el ? parseFloat(getComputedStyle(el).getPropertyValue(name)) : NaN;
  return Number.isFinite(v) ? (px * v) / base : px;
};
export const gapPx = (px: number): number => scaled("--k-gap", GAP, px);
export const strokePx = (px: number): number => scaled("--k-stroke", STROKE, px);
