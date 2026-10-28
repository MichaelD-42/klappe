import { text, typed, type BasicHandle } from "klappe/fx";
import { captioned } from "../../../caption";

// A text box types its line from onUpdate, a pure function of progress, so a seek shows the same text as play.
export default captioned("text() + typed(line, p) from onUpdate — a typewriter in the deck font", {
  build(ctx) {
    const box = text(ctx, { text: "", x: 160, y: 400, w: 1600, size: 72, weight: 700 });
    box.el.dataset.kText = ""; // the self-test compares this text between play and seek
    return box;
  },
  steps: [
    (tl, box: BasicHandle, ctx) => {
      const line = ctx.doc!.steps[0].text;
      box.show(tl);
      tl.to({}, {
        duration: line.length / 20, // characters per second
        ease: "none",
        onUpdate(this: gsap.core.Tween) {
          box.el.textContent = typed(line, this.progress());
        },
      });
    },
  ],
});
