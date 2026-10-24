import usedFx from "virtual:klappe-fx";
import { loadHighlighter } from "../fx/code";
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
const loaded: Partial<Parts> = {};
const loaders: { [K in keyof Parts]: () => Promise<Parts[K]> } = {
  agenda: () => import("../fx/agenda").then((m) => m.agenda),
  chart: () => import("../fx/chart").then((m) => m.chart),
  checklist: () => import("../fx/checklist").then((m) => m.checklist),
  shout: () => import("../fx/shout").then((m) => m.shout),
  terminal: () => import("../fx/terminal").then((m) => m.terminal),
};

// A part's effect. One that was not loaded throws, and the renderer shows EFFECT MISSING with a problem.
export function part<K extends keyof Parts>(name: K): Parts[K] {
  const f = loaded[name];
  if (!f) throw new Error(`${name}: not loaded`);
  return f;
}

// The parts the deck's scene.md files use (a scene with a scene.ts build draws itself), and whether
// Shiki must load: for a code fence, or when the deck's code imports code() (the build scans for it).
export function partsOf(deck: Deck, fx: string[]): { names: (keyof Parts)[]; highlight: boolean } {
  const names = new Set<keyof Parts>();
  let highlight = fx.includes("code") || fx.includes("*");
  for (const sec of deck.sections)
    for (const sc of sec.scenes) {
      if (sc.module?.build) continue;
      if (sc.fence?.lang === "console") names.add("terminal");
      else if (sc.fence) highlight = true;
      for (const s of sc.steps) {
        if (s.kind === "shout-enter") names.add("shout");
        if (s.part?.kind === "check") names.add("checklist");
        if (s.part?.kind === "agenda") names.add("agenda");
        if (s.media?.kind === "chart") names.add("chart");
      }
    }
  return { names: [...names], highlight };
}

// fixture: a test deck builds in code, so it gets everything.
export async function loadParts(deck: Deck, fixture = false): Promise<void> {
  const want = fixture
    ? { names: Object.keys(loaders) as (keyof Parts)[], highlight: true }
    : partsOf(deck, usedFx);
  await Promise.all([
    ...want.names.map(async (k) => void ((loaded as Record<string, unknown>)[k] = await loaders[k]())),
    want.highlight ? loadHighlighter() : undefined,
  ]);
}
