import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { importedFx, klappeScan, usedLangs } from "../../bin/scan-plugin.mjs";
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

describe("the scan plugin", () => {
  it("bundles the Lucide names that stand as string literals in the deck code, and only those", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "klappe-icons-"));
    try {
      fs.mkdirSync(path.join(dir, "sections", "node_modules"), { recursive: true });
      fs.writeFileSync(path.join(dir, "sections", "a.ts"), `icon(ctx, "shield-check", o); const n = ['Cpu', "no-such-icon"]; icon(ctx, "ro" + "cket", o);`);
      fs.writeFileSync(path.join(dir, "sections", "node_modules", "b.ts"), `icon(ctx, "bug", o)`);
      fs.writeFileSync(path.join(dir, "notes.md"), `"database"`);
      const plugin = klappeScan({ klappeDir: process.cwd(), deckDir: dir });
      const src = (plugin.load as (id: string) => string).call({}, "\0virtual:klappe-icons");
      expect(src.match(/"\w+": i\d+/g)).toEqual(['"Cpu": i0', '"ShieldCheck": i1']);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
  it("bundles the :icon-name: a scene.md list item starts with, and no other name in Markdown", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "klappe-md-icons-"));
    try {
      fs.writeFileSync(path.join(dir, "scene.md"), "## T\n\n- :rocket: Ship\n- [x] :shield-check: Safe\n- :shield-check: Safe\n- 09:00–09:30 :coffee: Hi\n\nA :bug: in prose.\n");
      const plugin = klappeScan({ klappeDir: process.cwd(), deckDir: dir });
      const src = (plugin.load as (id: string) => string).call({}, "\0virtual:klappe-icons");
      expect(src.match(/"\w+": i\d+/g)).toEqual(['"Coffee": i0', '"Rocket": i1', '"ShieldCheck": i2']);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
  it("lists the effects deck code imports from klappe/fx, by name", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "klappe-fx-"));
    try {
      fs.writeFileSync(path.join(dir, "a.ts"), `import { icon, code as c, type CodeHandle } from "klappe/fx";\nimport type { ShoutHandle } from "klappe/fx";`);
      fs.writeFileSync(path.join(dir, "b.ts"), `import { Rocket } from "klappe/fx/lucide";`);
      expect(importedFx([dir])).toEqual(["code", "icon"]);
      fs.writeFileSync(path.join(dir, "c.ts"), `import * as fx from "klappe/fx";`);
      expect(importedFx([dir])).toContain("*");
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
  it("finds the effects a deck component imports through shared/, with no scene.ts calling it", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "klappe-comp-"));
    try {
      fs.mkdirSync(path.join(dir, "shared"));
      fs.writeFileSync(path.join(dir, "components.ts"), `import { chip } from "./shared/chip";\nexport default { chip };`);
      fs.writeFileSync(path.join(dir, "shared", "chip.ts"), `import { qr, text } from "klappe/fx";`);
      expect(importedFx([dir])).toEqual(["qr", "text"]);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
  it("lists the languages deck code names as literal lang values", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "klappe-langs-"));
    try {
      fs.writeFileSync(path.join(dir, "a.ts"), `code(ctx, { src, lang: "python", x: 0 }); code(ctx, { lang:'ts' }); code(ctx, { lang: l });`);
      fs.writeFileSync(path.join(dir, "b.ts"), `code(ctx, { src, lang: \`sql\` }); code(ctx, { lang: "ts" });`);
      expect(usedLangs([dir])).toEqual(["python", "sql", "ts"]);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});

// A saved file rescans the deck: one walk and one read of each file, for all three modules.
describe("the scan plugin in dev", () => {
  it("reads each deck file once per change", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "klappe-once-"));
    try {
      const a = path.join(dir, "a.ts");
      fs.writeFileSync(a, `icon(ctx, "rocket", o);`);
      fs.writeFileSync(path.join(dir, "scene.md"), "- :coffee: Hi\n");
      const plugin = klappeScan({ klappeDir: process.cwd(), deckDir: dir }) as any;
      const on: Record<string, (f: string) => void> = {};
      plugin.configureServer({ watcher: { add() {}, on: (ev: string, fn: (f: string) => void) => (on[ev] = fn) }, moduleGraph: { getModuleById() {}, invalidateModule() {} }, ws: { send() {} } });
      for (const id of ["virtual:klappe-icons", "virtual:klappe-fx", "virtual:klappe-langs"]) plugin.load("\0" + id);
      fs.writeFileSync(a, `icon(ctx, "bug", o); code(ctx, { lang: "ts" });`);
      const read = vi.spyOn(fs, "readFileSync");
      const list = vi.spyOn(fs, "readdirSync");
      try {
        on.change(a);
        expect(read.mock.calls.filter(([f]) => f === a)).toHaveLength(1);
        expect(list.mock.calls.filter(([d]) => d === dir)).toHaveLength(1);
      } finally {
        read.mockRestore();
        list.mockRestore();
      }
      expect(plugin.load("\0virtual:klappe-icons")).toContain('"Bug"');
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});

// A scene folder renamed while `klappe dev` runs: the scan can list a file that is gone by the time it reads it.
describe("the scan plugin, with a file gone between listing and reading", () => {
  it("skips the missing file instead of throwing ENOENT", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "klappe-gone-"));
    try {
      fs.writeFileSync(path.join(dir, "a.ts"), `code(ctx, { lang: "ts" });`);
      fs.symlinkSync(path.join(dir, "moved", "scene.ts"), path.join(dir, "scene.ts")); // listed, cannot be read
      expect(usedLangs([dir])).toEqual(["ts"]);
      expect(importedFx([dir])).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});
