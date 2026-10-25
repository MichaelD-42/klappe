import { assembleDeck } from "../assemble";
import { compareTable, exerciseCard, type CompareTableHandle, type ExerciseCardHandle } from "klappe/fx";
import type { SceneModule, StepAdder } from "../../types";

// A table whose row adders are made in build out of step order, a short row, a row of text only (no marks), a missing
// row and a table too tall;
// a card with extras revealed per step, a missing extra and a card too tall (with no extras).
const columns = ["Basic", "Team", "Enterprise"];
const rows = [
  { label: "Single sign-on", cells: [false, true, true] },
  { label: "Audit log", cells: [false, "30 days", "1 year, exported every night to your own storage"] },
  { label: "Support", cells: ["Forum", "Email", true] },
];
const rect = { x: 160, y: 200, w: 1600, h: 640 };
const md = (title: string, n: number) => `## ${title}\n\n${Array.from({ length: n }, (_, i) => `- Step ${i + 1}.\n`).join("")}`;

interface Rows {
  t: CompareTableHandle;
  r: StepAdder[];
}
const order: SceneModule = {
  build: (ctx): Rows => {
    const t = compareTable(ctx, { columns, rows, ...rect });
    const [r2, r0, r1] = [t.row(2), t.row(0), t.row(1)]; // made out of order: the cue must still follow the steps
    return { t, r: [r0, r1, r2] };
  },
  steps: [(tl, x: Rows) => x.t.show(tl), (tl, x) => x.r[0](tl), (tl, x) => x.r[1](tl), (tl, x) => x.r[2](tl)],
};
const broken: SceneModule = {
  build: (ctx) => ({ t: compareTable(ctx, { columns, rows: [rows[0], { label: "Short", cells: [true, false] }, { label: "Text only", cells: ["A", "B", "C"] }], ...rect }) }),
  steps: [(tl, x: { t: CompareTableHandle }) => x.t.show(tl), (tl, x) => x.t.row(1)(tl), (tl, x) => x.t.row(9)(tl)],
};
const tall: SceneModule = {
  build: (ctx) => ({ t: compareTable(ctx, { columns, rows: Array.from({ length: 30 }, (_, i) => ({ label: `Feature ${i + 1}`, cells: [true, false, true] })), ...rect, h: 600 }) }),
  steps: [(tl, x: { t: CompareTableHandle }) => x.t.show(tl)],
};
const card: SceneModule = {
  build: (ctx) => ({
    c: exerciseCard(ctx, {
      title: "Sort the backlog", tasks: ["Pick the five oldest tickets.", "Tag each one: keep, merge or close."],
      extras: ["Find one ticket nobody owns.", "Write its owner on the board."], minutes: 15, group: "pairs", x: 360, y: 160, w: 1200, h: 760,
    }),
  }),
  steps: [(tl, x: { c: ExerciseCardHandle }) => x.c.show(tl), (tl, x) => x.c.extra(0)(tl), (tl, x) => x.c.extra(1)(tl), (tl, x) => x.c.extra(4)(tl)],
};
const cardTall: SceneModule = {
  build: (ctx) => ({ c: exerciseCard(ctx, { title: "Too tall", tasks: Array.from({ length: 20 }, (_, i) => `Task ${i + 1}`), x: 360, y: 160, w: 1200, h: 300 }) }),
  steps: [(tl, x: { c: ExerciseCardHandle }) => x.c.show(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Table and card\n",
      "sections/10-a/10-order/scene.md": md("Rows", 4),
      "sections/10-a/20-broken/scene.md": md("Broken", 3),
      "sections/10-a/30-tall/scene.md": md("Too tall", 1),
      "sections/10-a/40-card/scene.md": md("Card", 4),
      "sections/10-a/50-card-tall/scene.md": md("Card too tall", 1),
    },
    {
      "sections/10-a/10-order/scene.ts": order,
      "sections/10-a/20-broken/scene.ts": broken,
      "sections/10-a/30-tall/scene.ts": tall,
      "sections/10-a/40-card/scene.ts": card,
      "sections/10-a/50-card-tall/scene.ts": cardTall,
    },
  );
