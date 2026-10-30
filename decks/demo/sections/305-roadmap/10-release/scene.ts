import { roadmap, type RoadmapHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("roadmap(ctx, { milestones, today, … }) — reveal(id) adds one, its status tones it; move(date) moves today", {
  build: (ctx) => ({
    r: roadmap(ctx, {
      x: 160, y: 160, w: 1600, h: 760,
      today: "2026-07-20",
      milestones: [
        { id: "kick", date: "2026-07-01", label: "Kick-off", status: "done" },
        { id: "beta", date: "2026-09-15", label: "Beta for first customers", status: "risk" },
        { id: "launch", date: "2026-12-01", label: "Launch" },
      ],
    }),
  }),
  steps: [
    (tl, r: { r: RoadmapHandle }) => r.r.show(tl),
    (tl, r) => r.r.reveal("kick")(tl),
    (tl, r) => r.r.reveal("beta")(tl),
    (tl, r) => r.r.move("2026-10-24")(tl),
    (tl, r) => r.r.reveal("launch")(tl),
    (tl, r) => r.r.move("2026-12-01")(tl),
  ],
});
