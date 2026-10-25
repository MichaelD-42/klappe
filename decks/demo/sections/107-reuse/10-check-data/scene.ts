import { captioned } from "../../../caption";
import { checkpoint } from "../../../shared/checkpoint";

export default captioned(
  "checkpoint() in shared/ returns a scene; this scene.ts is one call to it",
  checkpoint({ ask: "Which chart shows a share of a whole?", hint: "Hint: it is round, with a hole in the middle." }),
);
