import { sequence, type SequenceHandle } from "klappe/fx";
import { captioned } from "../../../caption";

type R = { s: SequenceHandle };
const ids = ["a", "b", "c", "d"];
export default captioned("Rows are spaced evenly from the actor heads to the bottom of the frame", {
  build: (ctx) => ({
    s: sequence(ctx, {
      x: 160, y: 130, w: 1600, h: 780,
      actors: ids.map((id) => ({ id, label: `Service ${id.toUpperCase()}` })),
      messages: Array.from({ length: 12 }, (_, i) => ({ from: ids[i % 4], to: ids[(i + 1 + (i % 3)) % 4], text: `Message ${i + 1}`, reply: i % 2 === 1 })),
    }),
  }),
  steps: [
    (tl, r: R) => r.s.actors(tl),
    (tl, r: R) => { for (let i = 0; i < 6; i++) r.s.message(i)(tl); },
    (tl, r: R) => { for (let i = 6; i < 12; i++) r.s.message(i)(tl); },
  ],
});
