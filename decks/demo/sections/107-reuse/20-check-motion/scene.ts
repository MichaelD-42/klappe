import { captioned } from "../../../caption";
import { checkpoint } from "../../../shared/checkpoint";

export default captioned(
  "The same checkpoint() with other options; scene.md adds title and notes",
  checkpoint({ ask: "Why does a step use fromTo and not from?", hint: "Hint: think of a step back." }),
);
