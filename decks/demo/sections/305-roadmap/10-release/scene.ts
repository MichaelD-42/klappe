import { roadmap, type RoadmapHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("roadmap(ctx, { milestones, today, x, y, w, h }) — reveal(id) adds a milestone; move(date) moves today", {
  build: (ctx) => ({
    r: roadmap(ctx, {
      x: 160, y: 160, w: 1600, h: 760,
      today: "2026-07-20",
      milestones: [
        { id: "kick", date: "2026-07-01", label: "Kick-off" },
        { id: "beta", date: "2026-09-15", label: "Beta for first customers" },
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
