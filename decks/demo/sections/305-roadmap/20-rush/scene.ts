import { roadmap, type RoadmapHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("rush(from, to) lands a range of milestones in one step, faster and faster", {
  build: (ctx) => ({
    r: roadmap(ctx, {
      x: 160, y: 160, w: 1600, h: 760,
      today: "2026-10-20",
      milestones: [
        { id: "a", date: "2020-06-15", label: "Release A" },
        { id: "b", date: "2021-09-01", label: "Release B" },
        { id: "c", date: "2022-11-15", label: "Release C" },
        { id: "d", date: "2023-09-01", label: "Release D" },
        { id: "e", date: "2024-05-15", label: "Release E" },
        { id: "f", date: "2024-10-15", label: "Release F" },
        { id: "g", date: "2025-06-15", label: "Release G" },
        { id: "h", date: "2025-10-15", label: "Release H" },
        { id: "i", date: "2026-05-15", label: "Release I" },
        // No label, so a dot: a crowd of small releases shows the pace without more labels.
        { id: "x1", date: "2024-08-01", label: "" }, { id: "x2", date: "2024-12-05", label: "" }, { id: "x3", date: "2025-02-10", label: "" },
        { id: "x4", date: "2025-03-20", label: "" }, { id: "x5", date: "2025-08-20", label: "" }, { id: "x6", date: "2025-12-05", label: "" },
        { id: "x7", date: "2026-02-01", label: "" }, { id: "x8", date: "2026-02-20", label: "" }, { id: "x9", date: "2026-03-10", label: "" },
      ],
    }),
  }),
  steps: [
    (tl, r: { r: RoadmapHandle }) => r.r.show(tl),
    (tl, r) => r.r.reveal("a")(tl),
    (tl, r) => r.r.rush("b", "i")(tl),
  ],
});
