import { describe, expect, it, vi } from "vitest";
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
