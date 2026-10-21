import { terminal, type TerminalHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("terminal() — show and run(command), with a custom prompt", {
  build: (ctx) =>
    terminal(ctx, {
      lines: ["$ git status", "nothing to commit", "$ git log -1", "a1b2c3d ship it"],
      x: 160, y: 160, w: 1600, h: 600, prompt: ">",
    }),
  steps: [
    (tl, h: TerminalHandle) => {
      h.show(tl);
      h.run(0)(tl);
    },
    (tl, h: TerminalHandle) => h.run(1)(tl),
  ],
});
