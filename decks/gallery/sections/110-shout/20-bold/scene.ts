import { shout, type ShoutHandle } from "klappe/fx";
import { captioned } from "../../../caption";

// Per-scene intensity: shout() with intensity "bold", whatever deck.md says. The scene.md holds its 4 steps.
export default captioned('shout({ intensity: "bold" }) — a hard entry, a heavy dim, the answer pops', {
  build: (ctx) => shout(ctx, { question: "Who owns the release?", answer: "The team that ships it.", intensity: "bold" }),
  steps: [
    (tl, s: ShoutHandle) => s.enter(tl),
    (tl, s: ShoutHandle) => s.hold(tl),
    (tl, s: ShoutHandle) => s.fade(tl),
    (tl, s: ShoutHandle) => s.answer(tl),
  ],
});
