import { likert, title, type BasicHandle, type LikertHandle } from "klappe/fx";
import { captioned } from "../../../caption";

interface Refs {
  h: BasicHandle;
  l: LikertHandle;
}

export default captioned("likert(ctx, { rows: [{ statement, counts }] }) — then l.row(i) per step", {
  build: (ctx): Refs => ({
    h: title(ctx),
    l: likert(ctx, {
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
  }),
  steps: [(tl, r: Refs) => (r.h.show(tl), r.l.show(tl)), (tl, r: Refs) => r.l.row(0)(tl), (tl, r: Refs) => r.l.row(1)(tl), (tl, r: Refs) => r.l.row(2)(tl)],
});
