import { captioned } from "../../../caption";
import { splitHalf } from "../../../shared/split";

// Right of the split's first scene; camera duration 0 makes the move in a cut, not a flight.
export default captioned("camera: { duration: 0 } in scene.ts cuts into this scene alone", {
  ...splitHalf("rocket", "ok"),
  place: (rects) => ({ ...rects["split-before"], x: rects["split-before"].x + rects["split-before"].w }),
  camera: { duration: 0 },
});
