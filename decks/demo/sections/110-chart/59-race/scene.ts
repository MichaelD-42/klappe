import { barRace, type BarRaceHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("barRace(ctx, { src, rect, top }) — show, then to(period) on each step", {
  build: (ctx) => barRace(ctx, { src: "data/chart-race.csv", rect: { x: 160, y: 80, w: 1600, h: 840 }, title: "Deployments a week, by team", top: 6 }),
  steps: [(tl, r: BarRaceHandle) => r.show(tl), ...[1, 2, 3, 4].map((i) => (tl: gsap.core.Timeline, r: BarRaceHandle) => r.to(i)(tl))],
});
