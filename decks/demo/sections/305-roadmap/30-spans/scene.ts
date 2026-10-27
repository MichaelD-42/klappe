import { roadmap, type RoadmapHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("roadmap(ctx, { phases }) — reveal(id) grows a phase in its lane under the axis", {
  build: (ctx) => ({
    r: roadmap(ctx, {
      x: 160, y: 160, w: 1600, h: 760,
      today: "2026-07-20",
      milestones: [
        { id: "beta", date: "2026-09-15", label: "Beta for first customers" },
        { id: "launch", date: "2026-12-01", label: "Launch" },
      ],
      phases: [
        { id: "build", from: "2026-07-01", to: "2026-09-30", label: "Build" },
        { id: "pilot", from: "2026-09-15", to: "2026-11-30", label: "Pilot with three teams" },
        { id: "roll", from: "2026-12-01", to: "2027-02-28", label: "Roll-out" },
      ],
    }),
  }),
  steps: [
    (tl, r: { r: RoadmapHandle }) => r.r.show(tl),
    (tl, r) => r.r.reveal("build")(tl),
    (tl, r) => r.r.reveal("beta")(tl),
    (tl, r) => r.r.reveal("pilot")(tl),
    (tl, r) => (r.r.reveal("launch")(tl), r.r.reveal("roll")(tl)),
  ],
});
