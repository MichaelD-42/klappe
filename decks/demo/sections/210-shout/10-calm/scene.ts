import { shout, type ShoutHandle } from "klappe/fx";
import { captioned } from "../../../caption";

// Per-scene intensity: shout() with intensity "calm", whatever deck.md says. In scene.md, ### Question? uses the deck's intensity.
export default captioned('shout({ intensity: "calm" }) — a gentle dim, the question lands, then the answer', {
  build: (ctx) => shout(ctx, { question: "Who owns the release?", answer: "The team that ships it.", intensity: "calm" }),
  steps: [
    (tl, s: ShoutHandle) => s.enter(tl),
    (tl, s: ShoutHandle) => s.answer(tl),
  ],
}, "crt");
