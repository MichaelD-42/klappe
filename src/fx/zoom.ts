import type { gsap } from "gsap";
import type { CanvasRuntime } from "../render/world";
import type { TransitionOpts } from "./transitions";

// The camera dives into the ref opts.target on the old canvas (or its frame centre), then the new canvas scales in.
export function transitionZoom(from: CanvasRuntime, to: CanvasRuntime, opts: TransitionOpts): gsap.core.Timeline {
  throw new Error("transitionZoom: not built yet");
}
