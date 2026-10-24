import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { klappeIcons } from "../../bin/icons-plugin.mjs";
import { Rocket } from "../../src/fx/lucide";
import { iconGlyph } from "../../src/fx/icons";

describe("iconGlyph", () => {
  it("builds the shapes of a known Lucide name", () => {
    const problem = vi.fn();
    const g = iconGlyph("lightbulb", problem);
    expect(g.match(/<path /g)).toHaveLength(3);
    expect(g).toContain('d="M9 18h6"');
    expect(iconGlyph("grid-2x2", problem)).toContain("<rect ");
    expect(problem).not.toHaveBeenCalled();
  });
  it("records a problem and draws a crossed box for an unknown name", () => {
    for (const name of ["no-such-icon", "toString", ""]) {
      const problem = vi.fn();
      expect(iconGlyph(name, problem)).toBe('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8l8 8M16 8l-8 8"/>');
      expect(problem).toHaveBeenCalledWith(`icon: unknown Lucide name '${name}'`);
    }
  });
});

describe("iconGlyph with an IconNode", () => {
  it("draws the icon it is given, with no lookup", () => {
    const problem = vi.fn();
    expect(iconGlyph(Rocket, problem)).toBe(iconGlyph("rocket", problem));
    expect(problem).not.toHaveBeenCalled();
  });
});

describe("the icons plugin", () => {
  it("bundles the Lucide names that stand as string literals in the deck code, and only those", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "klappe-icons-"));
    try {
      fs.mkdirSync(path.join(dir, "sections", "node_modules"), { recursive: true });
      fs.writeFileSync(path.join(dir, "sections", "a.ts"), `icon(ctx, "shield-check", o); const n = ['Cpu', "no-such-icon"]; icon(ctx, "ro" + "cket", o);`);
      fs.writeFileSync(path.join(dir, "sections", "node_modules", "b.ts"), `icon(ctx, "bug", o)`);
      fs.writeFileSync(path.join(dir, "notes.md"), `"database"`);
      const plugin = klappeIcons({ klappeDir: process.cwd(), dirs: [dir] });
      const src = (plugin.load as (id: string) => string).call({}, "\0virtual:klappe-icons");
      expect(src.match(/"\w+": i\d+/g)).toEqual(['"Cpu": i0', '"ShieldCheck": i1']);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});
