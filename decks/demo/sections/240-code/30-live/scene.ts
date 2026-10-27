import { code, type CodeHandle } from "klappe/fx";
import { captioned } from "../../../caption";

const BEFORE = "function total(items) {\n  return items.length;\n}";
const AFTER = "function total(items) {\n  let sum = 0;\n  for (const item of items) sum += item.price;\n  return sum;\n}";

export default captioned("code({ lineNumbers: true }) and diff(src, { type: true }) — new lines type in", {
  build: (ctx) => code(ctx, { src: BEFORE, lang: "js", x: 160, y: 160, w: 1600, h: 600, lineNumbers: true }),
  steps: [
    (tl, h: CodeHandle) => h.show(tl),
    (tl, h: CodeHandle) => h.diff(AFTER, { type: true })(tl),
    (tl, h: CodeHandle) => h.focus([2, 3])(tl),
  ],
});
