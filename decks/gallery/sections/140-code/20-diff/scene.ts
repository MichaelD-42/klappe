import { code, type CodeHandle } from "klappe/fx";
import { captioned } from "../../../caption";

const BEFORE = "const data = load();\nconst valid = check(data);\nsave(valid);";
const AFTER = "const data = load();\nsave(data);\nlog(data);";

export default captioned("code() — show, focus(lines) and diff(newSrc) on one code panel", {
  build: (ctx) => code(ctx, { src: BEFORE, lang: "js", x: 160, y: 160, w: 1600, h: 600 }),
  steps: [
    (tl, h: CodeHandle) => h.show(tl),
    (tl, h: CodeHandle) => h.focus([2])(tl),
    (tl, h: CodeHandle) => h.diff(AFTER)(tl),
  ],
});
