import { describe, expect, it } from "vitest";
import calm from "../../src/themes/calm.css?raw";
import { contrast, parseTokens, resolveTheme } from "../../src/theme";

// Every built-in theme, by name.
const builtins = Object.fromEntries(
  Object.entries(import.meta.glob<string>("../../src/themes/*.css", { query: "?raw", import: "default", eager: true })).map(([f, css]) => [
    f.replace(/^.*\/|\.css$/g, ""),
    css,
  ]),
);

describe("theme", () => {
  it("parseTokens reads the :root declarations", () => {
    expect(parseTokens(calm)["--k-bg"]).toBe("#0f1b2d");
    expect(parseTokens(":root { --k-a: 1px; /* c */ --k-b : red; } .x { --k-c: 2; }")).toEqual({ "--k-a": "1px", "--k-b": "red" });
  });
  it("contrast follows WCAG", () => {
    expect(contrast("#000", "#fff")).toBeCloseTo(21, 1);
    expect(contrast("rgb(255, 255, 255)", "#ffffff")).toBeCloseTo(1, 2);
  });
  it("resolves deck, then repo, then built-in; unknown falls back to calm", () => {
    expect(resolveTheme("house", { "repo:house": "A", "deck:house": "B" }).css).toBe("B");
    expect(resolveTheme("house", { "repo:house": "A", "builtin:house": "C" }).css).toBe("A");
    expect(resolveTheme("bold", { "builtin:bold": "C" })).toEqual({ css: "C" });
    expect(resolveTheme("nope", {})).toEqual({ css: calm, problem: 'theme "nope" not found; using calm' });
  });
  it("ships calm, bold and five mood themes", () => {
    expect(Object.keys(builtins).sort()).toEqual(["bold", "calm", "daylight", "forest", "ink", "lavender", "sorbet"]);
  });
  for (const [name, css] of Object.entries(builtins)) {
    it(`${name} meets the contrast floors`, () => {
      const t = parseTokens(css);
      for (const bg of ["--k-bg", "--k-surface"])
        for (const fg of ["--k-fg", "--k-muted"]) expect(contrast(t[fg], t[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t["--k-accent"], t["--k-bg"])).toBeGreaterThanOrEqual(3);
      expect(contrast(t["--k-line"], t["--k-bg"])).toBeGreaterThanOrEqual(3);
    });
    // The code panel is --k-surface; a focused line shows its tokens at full colour.
    it(`${name} code colours hold 4.5:1 on the code panel`, () => {
      const t = parseTokens(css);
      for (const k of Object.keys(t).filter((k) => /^--k-code-(?:token-|foreground)/.test(k)))
        expect(contrast(t[k], t["--k-surface"]), k).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name} defines every calm token`, () => {
      const t = parseTokens(css);
      for (const k of Object.keys(parseTokens(calm))) expect(t, k).toHaveProperty([k]);
    });
  }
});
