import { assembleDeck } from "../assemble";
import { cardStack, stickyNotes, type CardStackHandle, type StickyNotesHandle, type StickyNotesOpts } from "klappe/fx";
import type { SceneModule, StepAdder } from "../../types";

// notes: show two, show the rest, group three, move one to another group, group one again where it is (no move).
// early: the group adder for "a" is built before the show adder, and "c" is grouped without a show (it fades in at its slot).
// stack: show, pull 1, pull 3 (1 goes back in the same step), back.
// leftover: every group forms with one note each; the two notes left over stay where they are.
const opts: StickyNotesOpts = {
  x: 160, y: 120, w: 1600, h: 780,
  notes: [
    { id: "a", text: "Onboarding is slow" },
    { id: "b", text: "Docs are hard to find" },
    { id: "c", text: "Love the CLI" },
    { id: "d", text: "Setup took a day" },
    { id: "e", text: "Search works well" },
  ],
  groups: [{ id: "pain", label: "Pain" }, { id: "gain", label: "Gain" }, { id: "docs", label: "Docs" }],
};
const md = (title: string, n: number) => `## ${title}\n\n${Array.from({ length: n }, (_, i) => `- Step ${i + 1}.\n`).join("")}`;
type N = { n: StickyNotesHandle };
type C = { c: CardStackHandle };

const notes: SceneModule = {
  build: (ctx) => ({ n: stickyNotes(ctx, opts) }),
  steps: [
    (tl, r: N) => r.n.show(["a", "b"])(tl),
    (tl, r: N) => r.n.show()(tl),
    (tl, r: N) => r.n.group("pain", ["a", "b", "d"])(tl),
    (tl, r: N) => r.n.group("docs", ["b"])(tl),
    (tl, r: N) => r.n.group("gain", ["c", "e"])(tl),
    (tl, r: N) => r.n.group("docs", ["b"])(tl),
  ],
};

const early: SceneModule = {
  build: (ctx) => {
    const n = stickyNotes(ctx, opts);
    const grouped = n.group("pain", ["a", "c"]);
    return { grouped, shown: n.show(["a", "b"]) };
  },
  steps: [(tl, r: { shown: StepAdder }) => r.shown(tl), (tl, r: { grouped: StepAdder }) => r.grouped(tl)],
};

const leftover: SceneModule = {
  build: (ctx) => ({ n: stickyNotes(ctx, opts) }),
  steps: [
    (tl, r: N) => r.n.show()(tl),
    (tl, r: N) => r.n.group("pain", ["a"])(tl),
    (tl, r: N) => r.n.group("gain", ["c"])(tl),
    (tl, r: N) => r.n.group("docs", ["e"])(tl),
  ],
};

// vote: dots add up per note over two steps and stay on the note when it moves; a vote past the most dots, or on a
// note not shown yet, is a problem.
const vote: SceneModule = {
  build: (ctx) => ({ n: stickyNotes(ctx, opts) }),
  steps: [
    (tl, r: N) => r.n.show(["a", "b", "c"])(tl),
    (tl, r: N) => (r.n.vote("a", 3)(tl), r.n.vote("b", 1)(tl)),
    (tl, r: N) => r.n.vote("a", 2)(tl),
    (tl, r: N) => r.n.group("pain", ["a", "b"])(tl),
    (tl, r: N) => (r.n.vote("c", 20)(tl), r.n.vote("d", 1)(tl)),
  ],
};

const stack: SceneModule = {
  build: (ctx) => ({ c: cardStack(ctx, { x: 780, y: 300, cards: ["Speed", "Trust", "Cost", "Reach", "Joy"] }) }),
  steps: [
    (tl, r: C) => r.c.show(tl),
    (tl, r: C) => r.c.pull(1)(tl),
    (tl, r: C) => r.c.pull(3)(tl),
    (tl, r: C) => r.c.back(tl),
  ],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Notes and cards\n",
      "sections/10-a/10-notes/scene.md": md("Notes", 6),
      "sections/10-a/20-early/scene.md": md("Built early", 2),
      "sections/10-a/30-stack/scene.md": md("Stack", 4),
      "sections/10-a/40-leftover/scene.md": md("Left over", 4),
      "sections/10-a/50-vote/scene.md": md("Vote", 5),
    },
    { "sections/10-a/10-notes/scene.ts": notes, "sections/10-a/20-early/scene.ts": early, "sections/10-a/30-stack/scene.ts": stack, "sections/10-a/40-leftover/scene.ts": leftover, "sections/10-a/50-vote/scene.ts": vote },
  );
