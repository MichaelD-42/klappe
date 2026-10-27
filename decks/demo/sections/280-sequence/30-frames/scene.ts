import { sequence, type SequenceHandle } from "klappe/fx";
import { captioned } from "../../../caption";

type R = { s: SequenceHandle };
export default captioned("sequence(ctx, { activations, frames, … }) — bars, a { note, over } row, frames", {
  build: (ctx) => ({
    s: sequence(ctx, {
      x: 160, y: 130, w: 1600, h: 780,
      actors: [{ id: "c", label: "Client" }, { id: "a", label: "API" }, { id: "w", label: "Worker" }],
      messages: [
        { from: "c", to: "a", text: "POST /jobs" },
        { note: "Checks the body", over: "a" },
        { from: "a", to: "w", text: "run job" },
        { from: "w", to: "w", text: "attempt" },
        { from: "w", to: "a", text: "done", reply: true },
        { from: "a", to: "c", text: "202 Accepted", reply: true },
        { from: "a", to: "c", text: "400 Bad Request", reply: true },
      ],
      activations: [{ actor: "a", from: 0, to: 6 }, { actor: "w", from: 2, to: 4 }],
      frames: [
        { kind: "alt", label: "valid", from: 2, to: 6, else: { at: 6, label: "invalid" } },
        { kind: "loop", label: "until it succeeds", from: 3, to: 3 },
      ],
    }),
  }),
  steps: [
    (tl, r: R) => r.s.actors(tl),
    (tl, r: R) => r.s.message(0)(tl),
    (tl, r: R) => r.s.message(1)(tl),
    (tl, r: R) => r.s.message(2)(tl),
    (tl, r: R) => r.s.message(3)(tl),
    (tl, r: R) => [4, 5, 6].forEach((i) => r.s.message(i)(tl)),
  ],
});
