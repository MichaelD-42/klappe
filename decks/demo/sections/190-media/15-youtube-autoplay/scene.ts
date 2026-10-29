import { video } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("v.show(tl), then v.play(tl) — the player starts on the play step, with sound unless muted: true; start and end play only 0:43 to 1:00", {
  build: (ctx) =>
    video(ctx, { href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "A sample YouTube video", start: 43, end: 60, rect: { x: 400, y: 220, w: 1120, h: 700 } }),
  steps: [(tl, v: ReturnType<typeof video>) => v.show(tl), (tl, v: ReturnType<typeof video>) => v.play(tl)],
});
