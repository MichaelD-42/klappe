import { describe, expect, it } from "vitest";
import { brandTheme, seriesApart, themeCss } from "../../src/brand-theme";
import { contrast } from "../../src/contrast";
import { parseTokens } from "../../src/theme";

const PAIRS: [string, string][] = [
  ["#3366ff", "#ff6633"],
  ["#3366ff", "#3467ff"], // near-identical
  ["#fff59d", "#fff9c4"], // very light yellow
  ["#0a1f44", "#050d22"], // very dark navy
  ["#808080", "#808080"], // grey: no hue
  ["#e91e63", "#00bcd4"],
];
const TOKENS = ["bg", "fg", "muted", "surface", "line", "accent", "accent-2", "ok", "warn", "bad", "scrim", ...[1, 2, 3, 4, 5, 6].map((i) => `series-${i}`)];

describe("built-in themes", () => {
  const builtins = import.meta.glob<string>("../../src/themes/*.css", { query: "?raw", import: "default", eager: true });
  for (const [f, css] of Object.entries(builtins))
    it(`${f.replace(/^.*\/|\.css$/g, "")} keeps its series apart for colour-blind readers`, () => {
      const t = parseTokens(css);
      expect(seriesApart([1, 2, 3, 4, 5, 6].map((i) => t[`--k-series-${i}`]))).toBeGreaterThanOrEqual(10);
    });
});

describe("brandTheme", () => {
  for (const light of [false, true])
    for (const pair of PAIRS) {
      const label = `${pair.join(" + ")} ${light ? "light" : "dark"}`;
      const t = brandTheme(pair, light);
      it(`${label} defines every colour token`, () => {
        for (const k of TOKENS) expect(t, k).toHaveProperty([`--k-${k}`]);
      });
      it(`${label} meets the contrast floors`, () => {
        for (const bg of ["--k-bg", "--k-surface"]) {
          for (const fg of ["--k-fg", "--k-muted"]) expect(contrast(t[fg], t[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
          expect(contrast(t["--k-accent"], t[bg])).toBeGreaterThanOrEqual(3);
          expect(contrast(t["--k-accent-2"], t[bg])).toBeGreaterThanOrEqual(3);
        }
        expect(contrast(t["--k-line"], t["--k-bg"])).toBeGreaterThanOrEqual(3);
        expect(contrast(t["--k-line"], t["--k-bg"])).toBeLessThan(contrast(t["--k-muted"], t["--k-bg"]));
      });
      it(`${label} keeps the series apart for colour-blind readers`, () => {
        expect(seriesApart([1, 2, 3, 4, 5, 6].map((i) => t[`--k-series-${i}`]))).toBeGreaterThanOrEqual(10); // bold, the closest built-in, has 11.5
      });
      it(`${label} holds the code colours on the panel`, () => {
        const keys = Object.keys(t).filter((k) => /^--k-code-(?:token-|foreground)/.test(k));
        expect(keys).toHaveLength(10);
        for (const k of keys) expect(contrast(t[k], t["--k-surface"]), k).toBeGreaterThanOrEqual(4.5);
      });
    }

  it("nudges a brand colour only when it fails, and keeps its hue", () => {
    expect(brandTheme(["#3366ff", "#ff6633"])["--k-accent"]).toBe("#3366ff"); // 3:1 on the dark page already
    const navy = brandTheme(["#0a1f44", "#050d22"])["--k-accent"];
    expect(navy).not.toBe("#0a1f44");
    expect(navy.startsWith("#0")).toBe(false); // lightened, still a blue: red channel stays the lowest
    const [r, , b] = [1, 3, 5].map((i) => parseInt(navy.slice(i, i + 2), 16));
    expect(b).toBeGreaterThan(r);
  });

  it("never makes a warm or cream page", () => {
    const bg = brandTheme(["#fff59d", "#fff9c4"], true)["--k-bg"];
    const [r, , b] = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16));
    expect(b).toBeGreaterThanOrEqual(r);
  });

  it("writes a header that names the inputs", () => {
    const css = themeCss("acme", ["#3366ff", "#ff6633"], true);
    expect(css).toContain("--colors #3366ff,#ff6633 --light");
    expect(parseTokens(css)).toEqual(brandTheme(["#3366ff", "#ff6633"], true));
  });
});
