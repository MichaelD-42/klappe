import { assembleDeck } from "../assemble";
import { chart, gauge, likert, type ChartHandle, type GaugeHandle, type LikertHandle } from "klappe/fx";
import type { SceneModule, StepAdder } from "../../types";

// A German deck (number format 72,5). A gauge whose swing adders are built out of step order: the swing to
// 95,5 is built after the swing to 40 but plays first. A Likert block with a four-name scale and one bad row
// (the fixture's two problems), its rows one per step. A bar chart revealed one bar per step. All numbers are
// made-up sample data.
const md = (title: string, n: number) => `## ${title}\n\n${Array.from({ length: n }, (_, i) => `- Schritt ${i + 1}.\n`).join("")}`;
type G = { g: GaugeHandle; low: StepAdder; high: StepAdder };

const dial: SceneModule = {
  build: (ctx): G => {
    const g = gauge(ctx, { x: 560, y: 160, size: 800, value: 72.5, max: 100, unit: "%", label: "Auslastung", source: "klappe demo sample" });
    const low = g.to(40);
    return { g, low, high: g.to(95.5) };
  },
  steps: [(tl, s: G) => s.g.show(tl), (tl, s: G) => s.high(tl), (tl, s: G) => s.low(tl)],
};

const survey: SceneModule = {
  build: (ctx) =>
    likert(ctx, {
      x: 160,
      y: 160,
      w: 1600,
      rows: [
        { statement: "Die Releases sind planbar", counts: [2, 4, 6, 18, 10] },
        { statement: "Ich weiß, wer entscheidet", counts: [9, 12, 8, 7, 4] },
        { statement: "Ein Eintrag mit drei Zahlen", counts: [1, 2, 3] },
      ],
      scale: ["Nein", "Egal", "Ja"], // three names: a problem, the default five show
    }),
  steps: [(tl, l: LikertHandle) => l.show(tl), (tl, l: LikertHandle) => l.row(0)(tl), (tl, l: LikertHandle) => l.row(1)(tl)],
};

const data = [
  { q: "Q1", n: 120 },
  { q: "Q2", n: 185 },
  { q: "Q3", n: 150 },
];
const bars: SceneModule = {
  build: (ctx) => chart(ctx, { src: "data/inline.csv", data, rect: { x: 160, y: 120, w: 1600, h: 800 }, title: "Stück" }),
  steps: [(tl, c: ChartHandle) => c.axes(tl), (tl, c: ChartHandle) => c.bar(0)(tl), (tl, c: ChartHandle) => c.bar(1)(tl), (tl, c: ChartHandle) => c.bar(2)(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\nlang: de\n---\n",
      "sections/10-a/section.md": "# Zahlen\n",
      "sections/10-a/10-dial/scene.md": md("Tacho", 3),
      "sections/10-a/20-survey/scene.md": md("Umfrage", 3),
      "sections/10-a/30-bars/scene.md": md("Balken", 4),
    },
    { "sections/10-a/10-dial/scene.ts": dial, "sections/10-a/20-survey/scene.ts": survey, "sections/10-a/30-bars/scene.ts": bars },
  );
