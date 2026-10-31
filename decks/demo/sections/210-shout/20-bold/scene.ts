import { shout, type ShoutHandle } from "klappe/fx";
import { captioned } from "../../../caption";

// Per-scene intensity: shout() with intensity "bold", whatever deck.md says. With the pause beat, fade, which only
// scene.ts has: the question fades to a trace before the answer. The scene.md holds its 3 steps.
export default captioned('shout({ intensity: "bold" }) and fade — a hard entry, a heavy dim, a pause, the answer pops', {
  build: (ctx) => shout(ctx, { question: "Who owns the release?", answer: "The team that ships it.", intensity: "bold" }),
  steps: [
    (tl, s: ShoutHandle) => s.enter(tl),
    (tl, s: ShoutHandle) => s.fade(tl),
    (tl, s: ShoutHandle) => s.answer(tl),
  ],
});
