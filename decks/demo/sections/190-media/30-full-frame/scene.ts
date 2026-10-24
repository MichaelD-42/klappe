import { video } from "klappe/fx";
import type { SceneModule } from "klappe/types";

const scene: SceneModule = {
  build: (ctx) => video(ctx, { href: "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4", title: ctx.doc!.title }),
  steps: [(tl, v: ReturnType<typeof video>) => v.show(tl)],
};
export default scene;
