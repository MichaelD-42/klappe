import type { Ctx, StepAdder } from "../types";

// The fence languages loadHighlighter bundles; any other language shows plain.
export const LANGS = ["ts", "js", "python", "bash", "json", "yaml", "sql", "html", "css"];

export interface CodeOpts {
  src: string;
  lang: string;
  x: number;
  y: number;
  w: number;
  h?: number;
}
export interface CodeHandle {
  show: StepAdder;
  focus(lines: number[]): StepAdder; // 1-based; [] unfocuses everything
  diff(src: string): StepAdder;
  line(n: number): Element; // a callout target
}

// Shiki's one-time async init; main.ts awaits it before the world renders.
export async function loadHighlighter(): Promise<void> {}

export function code(ctx: Ctx, opts: CodeOpts): CodeHandle {
  throw new Error("code: not built yet");
}

// A fence's highlight groups, one per step: "1-2|4" gives [[1, 2], [4]].
export function parseGroups(info: string): number[][] {
  return info.split("|").map((g) =>
    g.split(",").flatMap((r) => {
      if (!r.trim()) return [];
      const [a, b = a] = r.split("-").map(Number);
      return Array.from({ length: b - a + 1 }, (_, k) => a + k);
    }),
  );
}
