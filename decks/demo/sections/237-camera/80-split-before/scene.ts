import { captioned } from "../../../caption";
import { splitHalf } from "../../../shared/split";

export default captioned("place() puts two scenes side by side; ctx.camera.to(tl, both, { duration: 0 }) cuts to both", splitHalf("calendar", "warn"));
