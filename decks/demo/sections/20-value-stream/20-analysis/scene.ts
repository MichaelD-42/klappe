import type { SceneModule } from "../../../../../src/types";
import { stageFrame } from "../section";

// The scene sits on the Analysis stage, so its default text is in frame when the camera lands.
// No build(): the default renderer shows steps 2 to 4 as text until M2 draws them.
const scene: SceneModule = {
  place: () => stageFrame("analysis"),
  steps: [
    // The engine already flies to this scene's rect, which is the same frame; this states the intent.
    (tl, _refs, ctx) => ctx.camera.to(tl, ctx.canvas.refs.stages.analysis),
    null,
    null,
    null,
  ],
};
export default scene;
