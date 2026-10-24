import usedFx from "virtual:klappe-fx";
import usedLangs from "virtual:klappe-langs";
import { LANGS, loadHighlighter } from "../fx/code";
import { lazyTable } from "../lazy";
import type { Deck } from "../types";

// The effects the default renderer plays for scene.md parts. Each one loads only when a scene.md uses it:
// main.ts awaits loadParts before the world renders, so a deck without charts never fetches d3.
type Parts = {
  agenda: typeof import("../fx/agenda").agenda;
  chart: typeof import("../fx/chart").chart;
  checklist: typeof import("../fx/checklist").checklist;
  shout: typeof import("../fx/shout").shout;
  terminal: typeof import("../fx/terminal").terminal;
};
const table = lazyTable<Parts>({
  agenda: () => import("../fx/agenda").then((m) => m.agenda),
  chart: () => import("../fx/chart").then((m) => m.chart),
  checklist: () => import("../fx/checklist").then((m) => m.checklist),
  shout: () => import("../fx/shout").then((m) => m.shout),
  terminal: () => import("../fx/terminal").then((m) => m.terminal),
});

// A part's effect. One that was not loaded throws, and the renderer shows EFFECT MISSING with a problem.
export const part = <K extends keyof Parts>(name: K): Parts[K] => table.get(name);

// The parts the deck's scene.md files use (a scene with a scene.ts build draws itself), and the grammars
// Shiki loads: each code fence's, and the lang values of code() when the deck's code imports it (the build scans for both).
export function partsOf(deck: Deck, fx: string[], langs: string[]): { names: (keyof Parts)[]; langs: string[] } {
  const names = new Set<keyof Parts>();
  const want = new Set(fx.includes("code") || fx.includes("*") ? langs : []);
  for (const sec of deck.sections)
    for (const sc of sec.scenes) {
      if (sc.module?.build) continue;
      if (sc.fence?.lang === "console") names.add("terminal");
      else if (sc.fence) want.add(sc.fence.lang);
      for (const s of sc.steps) {
        if (s.kind === "shout-enter") names.add("shout");
        if (s.part?.kind === "check") names.add("checklist");
        if (s.part?.kind === "agenda") names.add("agenda");
        if (s.media?.kind === "chart") names.add("chart");
      }
    }
  return { names: [...names], langs: LANGS.filter((l) => want.has(l)) };
}

// fixture: a test deck builds in code, so it gets everything.
export async function loadParts(deck: Deck, fixture = false): Promise<void> {
  const want = fixture
    ? { names: table.names, langs: LANGS }
    : partsOf(deck, usedFx, usedLangs);
  await Promise.all([
    table.load(want.names),
    want.langs.length ? loadHighlighter(want.langs) : undefined,
  ]);
}
