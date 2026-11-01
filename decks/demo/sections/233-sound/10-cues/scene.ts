import { cue, iconTile, impactShake, type IconHandle } from "klappe/fx";
import type { StepAdder } from "klappe/types";
import { captioned } from "../../../caption";

interface Refs {
  tile: IconHandle;
  whoosh: StepAdder;
  hit: StepAdder;
  land: StepAdder;
}

// Files made for the demo with ffmpeg: a filtered pink-noise whoosh, a 70 Hz hit, a three-note pad for the bed.
export default captioned('cue(ctx, { href: "media/sound-hit.mp3" }) on a step; section.ts music for a bed', {
  build: (ctx): Refs => ({
    tile: iconTile(ctx, "volume-2", { x: 960, y: 470, size: 240, tone: "accent" }),
    whoosh: cue(ctx, { href: "media/sound-whoosh.mp3", at: "step", volume: 0.6 }),
    hit: cue(ctx, { href: "media/sound-hit.mp3" }),
    land: impactShake(ctx),
  }),
  steps: [(tl, r: Refs) => r.whoosh(tl), (tl, r: Refs) => (r.tile.draw(tl), r.hit(tl), r.land(tl))],
});
