import type { SceneModule } from "klappe/types";
import { stageFrame } from "../section";

// No build() and no steps: the default renderer shows the step text until M2 draws it.
const scene: SceneModule = {
  // place() is the scene's home frame: the engine flies there on entry. camera.to is for moves within a scene.
  place: () => stageFrame("clarification"),
};
export default scene;
