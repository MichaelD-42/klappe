import { likert, type LikertHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("likert(ctx, { rows: [{ statement, counts }] }) — then l.row(i) per step", {
  build: (ctx): LikertHandle =>
    likert(ctx, {
      x: 160,
      y: 320,
      w: 1600,
      rows: [
        { statement: "Releases are predictable", counts: [3, 5, 8, 22, 12] },
        { statement: "I know who decides", counts: [11, 14, 9, 10, 6] },
        { statement: "Our tools help me", counts: [4, 9, 15, 16, 6] },
      ],
      source: "klappe demo sample",
    }),
  steps: [(tl, l: LikertHandle) => l.show(tl), (tl, l: LikertHandle) => l.row(0)(tl), (tl, l: LikertHandle) => l.row(1)(tl), (tl, l: LikertHandle) => l.row(2)(tl)],
});
