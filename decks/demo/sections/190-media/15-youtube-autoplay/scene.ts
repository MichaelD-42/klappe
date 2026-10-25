import { video } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("video(ctx, { …, autoplay: true }) — muted by default; muted: false asks for sound, which a browser may block", {
  build: (ctx) =>
    video(ctx, { href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "A sample YouTube video", rect: { x: 400, y: 220, w: 1120, h: 700 }, autoplay: true }),
  steps: [(tl, v: ReturnType<typeof video>) => v.show(tl)],
});
