import { cue, iconTile, impactShake, type IconHandle } from "klappe/fx";
import type { StepAdder } from "klappe/types";
import { captioned } from "../../../caption";

interface Refs {
  tile: IconHandle;
  whoosh: StepAdder;
  hit: StepAdder;
  land: StepAdder;
}

// klappe's own sounds by name; a deck's own file goes by its link, "media/my-sound.mp3".
export default captioned('cue(ctx, { href: "hit" }) on a step; section.ts music: { href: "bed-calm" } for a bed', {
  build: (ctx): Refs => ({
    tile: iconTile(ctx, "volume-2", { x: 960, y: 470, size: 240, tone: "accent" }),
    whoosh: cue(ctx, { href: "whoosh", at: "step", volume: 0.6 }),
    hit: cue(ctx, { href: "hit" }),
    land: impactShake(ctx),
  }),
  steps: [(tl, r: Refs) => r.whoosh(tl), (tl, r: Refs) => (r.tile.draw(tl), r.hit(tl), r.land(tl))],
});
