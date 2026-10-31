import { contrast, rgb } from "./contrast";

// Derives a full colour theme from two brand colours. Pure, so `klappe theme` and the unit tests share it.

type Hsl = [number, number, number]; // degrees, 0-1, 0-1

const toHsl = (c: string): Hsl => {
  const [r, g, b] = rgb(c).map((v) => v / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  if (!d) return [0, 0, l];
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, d / (1 - Math.abs(2 * l - 1)), l];
};
const hex = ([h, s, l]: Hsl): string => {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

// Linear sRGB through the Machado 2009 matrices (full severity), then CIE Lab, so distances are perceptual.
const CVD = [
  [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]], // protan
  [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]], // deutan
  [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]], // tritan
];
const lin = (c: string) => rgb(c).map((v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
const lab = (l: number[]): number[] => {
  const [x, y, z] = [
    (0.4124 * l[0] + 0.3576 * l[1] + 0.1805 * l[2]) / 0.95047,
    0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2],
    (0.0193 * l[0] + 0.1192 * l[1] + 0.9505 * l[2]) / 1.08883,
  ].map((t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116));
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};

/** How far apart two colours stay for the worst of normal sight, protanopia, deuteranopia and tritanopia (CIE76 ΔE). */
export function cvdDistance(a: string, b: string): number {
  const [la, lb] = [lin(a), lin(b)];
  return Math.min(
    ...[null, ...CVD].map((m) => {
      const sim = (l: number[]) => (m ? m.map((row) => row[0] * l[0] + row[1] * l[1] + row[2] * l[2]) : l);
      const [p, q] = [lab(sim(la)), lab(sim(lb))];
      return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    }),
  );
}

/** The built-in themes' rule: series 1 to 4 stay apart from each other, 5 and 6 from their neighbours. Returns the smallest distance. */
export function seriesApart(s: string[]): number {
  const pairs = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3], [3, 4], [4, 5]];
  return Math.min(...pairs.map(([i, j]) => cvdDistance(s[i], s[j])));
}

const FLOORS = { text: 4.5, ink: 3 };

// Steps the lightness of `c` away from the page, in 1 % steps, until it holds `min` on every background; keeps the hue.
function nudge(c: string, bgs: string[], min: number, light: boolean): string {
  const [h, s, l0] = toHsl(c);
  for (let l = l0; l >= 0 && l <= 1; l += light ? -0.01 : 0.01) {
    const out = hex([h, s, l]);
    if (bgs.every((bg) => contrast(out, bg) >= min)) return out;
  }
  return light ? "#000000" : "#ffffff";
}

// Syntax colours as daylight (light panel) and calm (dark panel) have them; each is nudged to 4.5:1 on the derived panel.
const CODE = {
  light: ["#11161f", "#9a4d00", "#11795a", "#5f6b7c", "#6b3fd1", "#b4451a", "#1f5ad6", "#11795a", "#3e4757", "#0b6a7e"],
  dark: ["#e8edf5", "#ffb547", "#8fdc9f", "#8497b0", "#c792ea", "#ffcf8a", "#6cb6ff", "#8fdc9f", "#b4c2d6", "#4dd0e1"],
};
const CODE_KEYS = ["foreground", ...["constant", "string", "comment", "keyword", "parameter", "function", "string-expression", "punctuation", "link"].map((k) => `token-${k}`)];

/** Every colour token of a theme, from two brand colours (#rgb or #rrggbb): colour 1 the accent, colour 2 the second accent. */
export function brandTheme(colors: [string, string], light = false): Record<string, string> {
  const [h0, s0] = toHsl(colors[0]);
  // A grey brand colour has no hue; a light page tints cool, never warm (no cream).
  const hue = s0 < 0.08 ? 215 : h0;
  const pageHue = light && hue > 20 && hue < 110 ? 215 : hue;
  const bg = hex([pageHue, light ? 0.3 : 0.35, light ? 0.98 : 0.1]);
  const surface = hex([pageHue, light ? 0.3 : 0.3, light ? 0.93 : 0.16]);
  const bgs = [bg, surface];
  const fg = nudge(hex([pageHue, 0.2, light ? 0.1 : 0.95]), bgs, 7, light);
  const muted = nudge(hex([pageHue, 0.15, light ? 0.35 : 0.72]), bgs, FLOORS.text, light);
  // Starts at the floor and stops there, so it stays dimmer than muted.
  const line = nudge(hex([pageHue, 0.15, light ? 0.65 : 0.4]), [bg], FLOORS.ink, light);
  const ink = (c: string) => nudge(c, bgs, FLOORS.ink, light);
  const accent = ink(colors[0]);
  const t: Record<string, string> = {
    bg, fg, muted, surface, line,
    accent,
    "accent-2": ink(colors[1]),
    ok: ink(hex([150, 0.55, 0.45])),
    warn: ink(hex([40, 0.9, 0.5])),
    bad: ink(hex([350, 0.7, 0.55])),
  };
  // Series: colour 1 first, then the candidate farthest from those chosen, by the worst colour-blind distance.
  const cands = [0.5, 0.65].flatMap((l) => Array.from({ length: 24 }, (_, i) => ink(hex([i * 15, 0.7, light ? l - 0.15 : l]))));
  const series = [accent];
  while (series.length < 6) {
    const far = (c: string) => Math.min(...series.map((s) => cvdDistance(c, s)));
    series.push(cands.reduce((best, c) => (far(c) > far(best) ? c : best)));
  }
  series.forEach((c, i) => (t[`series-${i + 1}`] = c));
  t.scrim = light ? "#fff" : "#000";
  t["code-background"] = bg;
  CODE_KEYS.forEach((k, i) => (t[`code-${k}`] = nudge(CODE[light ? "light" : "dark"][i], [surface], FLOORS.text, light)));
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [`--k-${k}`, v]));
}

/** The theme file: a header naming the inputs (a re-run with them gives the same file), then the tokens on :root. */
export function themeCss(name: string, colors: [string, string], light = false): string {
  const body = Object.entries(brandTheme(colors, light)).map(([k, v]) => `  ${k}: ${v};`);
  return `/* ${name}: derived by \`klappe theme --colors ${colors.join(",")}${light ? " --light" : ""}\` (${light ? "light" : "dark"}). */\n:root {\n${body.join("\n")}\n}\n`;
}
