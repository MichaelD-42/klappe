import { captioned } from "../../../caption";
import { checkpoint } from "../../../shared/checkpoint";

export default captioned(
  "The same checkpoint() with other options: scene.md gives the title and notes, the options give the rest",
  checkpoint({ ask: "Why does a step use fromTo and not from?", hint: "Hint: think of a step back." }),
);
