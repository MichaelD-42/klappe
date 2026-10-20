import { assembleDeck } from "../assemble";
import { sequence, type SequenceHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// actors, message with a reply and a self-message, 12 messages in frame, and one label too long for its gap
// (the fixture's only problem).
const rect = { x: 160, y: 130, w: 1600, h: 780 };
const md = (title: string, n = 2) => `## ${title}\n\n${Array.from({ length: n }, (_, i) => `- Step ${i + 1}.\n`).join("")}`;
type R = { s: SequenceHandle };

const basic: SceneModule = {
  build: (ctx) => ({
    s: sequence(ctx, {
      ...rect,
      actors: [{ id: "c", label: "Client" }, { id: "a", label: "API" }, { id: "d", label: "Database" }],
      messages: [
        { from: "c", to: "a", text: "POST /orders" },
        { from: "a", to: "a", text: "Validate" },
        { from: "a", to: "d", text: "INSERT order" },
        { from: "d", to: "a", text: "id: 42", reply: true },
        { from: "a", to: "c", text: "201 Created", reply: true },
      ],
    }),
  }),
  steps: [(tl, r: R) => r.s.actors(tl), (tl, r: R) => r.s.message(0)(tl), (tl, r: R) => { r.s.message(1)(tl); r.s.message(2)(tl); }, (tl, r: R) => { r.s.message(3)(tl); r.s.message(4)(tl); }],
};
const ids = ["a", "b", "c", "d"];
const twelve: SceneModule = {
  build: (ctx) => ({
    s: sequence(ctx, {
      ...rect,
      actors: ids.map((id) => ({ id, label: `Service ${id.toUpperCase()}` })),
      messages: Array.from({ length: 12 }, (_, i) => ({ from: ids[i % 4], to: ids[(i + 1 + (i % 3)) % 4], text: `Message ${i + 1}`, reply: i % 2 === 1 })),
    }),
  }),
  steps: [
    (tl, r: R) => r.s.actors(tl),
    (tl, r: R) => { for (let i = 0; i < 6; i++) r.s.message(i)(tl); },
    (tl, r: R) => { for (let i = 6; i < 12; i++) r.s.message(i)(tl); },
  ],
};
const long: SceneModule = {
  build: (ctx) => ({
    s: sequence(ctx, {
      ...rect,
      actors: ["a", "b", "c", "d"].map((id) => ({ id, label: id.toUpperCase() })),
      messages: [{ from: "a", to: "b", text: "A message label far too long to sit between two neighbouring lifelines" }],
    }),
  }),
  steps: [(tl, r: R) => r.s.actors(tl), (tl, r: R) => r.s.message(0)(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Sequence\n",
      "sections/10-a/10-basic/scene.md": md("Basic", 4),
      "sections/10-a/20-twelve/scene.md": md("Twelve", 3),
      "sections/10-a/30-long/scene.md": md("Too long"),
    },
    { "sections/10-a/10-basic/scene.ts": basic, "sections/10-a/20-twelve/scene.ts": twelve, "sections/10-a/30-long/scene.ts": long },
  );
