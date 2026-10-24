import { sequence, type SequenceHandle } from "klappe/fx";
import { captioned } from "../../../caption";

type R = { s: SequenceHandle };
export default captioned("sequence(ctx, { actors, messages, x, y, w, h }) — message(i) draws one arrow; replies are dashed", {
  build: (ctx) => ({
    s: sequence(ctx, {
      x: 160, y: 130, w: 1600, h: 780,
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
  steps: [
    (tl, r: R) => r.s.actors(tl),
    (tl, r: R) => r.s.message(0)(tl),
    (tl, r: R) => { r.s.message(1)(tl); r.s.message(2)(tl); },
    (tl, r: R) => { r.s.message(3)(tl); r.s.message(4)(tl); },
  ],
});
