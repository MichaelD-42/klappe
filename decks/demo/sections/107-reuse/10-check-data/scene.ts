import { captioned } from "../../../caption";
import { checkpoint } from "../../../shared/checkpoint";

export default captioned(
  "shared/checkpoint.ts returns a SceneModule; this scene.ts is export default checkpoint({ ask, hint })",
  checkpoint({ ask: "Which chart shows a share of a whole?", hint: "Hint: it is round, with a hole in the middle." }),
);
