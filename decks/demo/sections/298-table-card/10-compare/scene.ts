import { compareTable, title, type BasicHandle, type CompareTableHandle } from "klappe/fx";
import { captioned } from "../../../caption";

interface Refs {
  h: BasicHandle;
  t: CompareTableHandle;
}

export default captioned("compareTable(ctx, { columns, rows }) — row(i) lands ticks and crosses cell by cell", {
  build: (ctx): Refs => ({
    h: title(ctx),
    t: compareTable(ctx, {
      x: 160, y: 300, w: 1600, h: 620,
      columns: ["Starter", "Team", "Business"],
      rows: [
        { label: "Single sign-on", cells: [false, true, true] },
        { label: "Audit log", cells: [false, "30 days", "1 year"] },
        { label: "Support", cells: ["Forum", "Email", "Phone"] },
        { label: "Export to CSV", cells: [true, true, true] },
      ],
    }),
  }),
  steps: [
    (tl, r: Refs) => (r.h.show(tl), r.t.show(tl)),
    (tl, r) => r.t.row(0)(tl),
    (tl, r) => r.t.row(1)(tl),
    (tl, r) => r.t.row(2)(tl),
    (tl, r) => r.t.row(3)(tl),
  ],
});
