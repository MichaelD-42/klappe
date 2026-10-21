import { callout, code, type CalloutHandle, type CodeHandle } from "klappe/fx";
import { captioned } from "../../../caption";

const SRC = "const data = load();\nconst bad = check(data);\nsave(bad);";

export default captioned("callout() — a leader line draws on, then the label and its text fade in", {
  build: (ctx) => {
    const c = code(ctx, { src: SRC, lang: "js", x: 160, y: 160, w: 1000, h: 400 });
    return { c, note: callout(ctx, { target: c.line(2), text: "This line is the bug", side: "right" }) };
  },
  steps: [(tl, r: { c: CodeHandle }) => r.c.show(tl), (tl, r: { note: CalloutHandle }) => r.note.show(tl)],
});
