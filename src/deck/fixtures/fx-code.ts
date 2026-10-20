import { assembleDeck } from "../assemble";
import { code, type CodeHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// The code walkthrough: a Markdown fence with three highlight groups, a scene.ts diff with every handle
// method, every bundled language, and two scenes that mean to cause problems: a 40-line block that does
// not fit, and highlight groups out of range and reversed.
const f = "```";
const WALK = [
  "function total(items) {",
  "  let sum = 0;",
  "  for (const item of items) {",
  "    sum += item.price;",
  "  }",
  "  return sum;",
  "}",
  "console.log(total([]));",
].join("\n");

const BEFORE = ["const a = load();", "const b = check(a);", "save(b);"].join("\n");
const AFTER = ["const a = load();", "save(a);", "log(a);"].join("\n");

// The diff scene: show, focus line 2, diff (line 2 goes, line 3 moves up, log comes in), focus the new line,
// unfocus. Line 1 carries data-target, so a test can find line(n).
const diff: SceneModule = {
  build(ctx) {
    const h = code(ctx, { src: BEFORE, lang: "js", x: 160, y: 200, w: 1200, h: 500 });
    h.line(1).setAttribute("data-target", "");
    return h;
  },
  steps: [
    (tl, h: CodeHandle) => h.show(tl),
    (tl, h: CodeHandle) => h.focus([2])(tl),
    (tl, h: CodeHandle) => h.diff(AFTER)(tl),
    (tl, h: CodeHandle) => h.focus([3])(tl),
    (tl, h: CodeHandle) => h.focus([])(tl),
  ],
};

// Three lines in each bundled language, in a 3 x 3 grid.
const SAMPLES: [string, string][] = [
  ["ts", "type Item = { price: number };\nconst sum = (xs: Item[]) =>\n  xs.reduce((s, x) => s + x.price, 0);"],
  ["js", "export function greet(name) {\n  return `Hello, ${name}`;\n}"],
  ["python", "def greet(name):\n    # say hello\n    return f\"Hello, {name}\""],
  ["bash", "for f in *.md; do\n  echo \"$f\"\ndone"],
  ["json", "{\n  \"name\": \"demo\", \"port\": 8080\n}"],
  ["yaml", "service:\n  name: demo\n  port: 8080"],
  ["sql", "SELECT name, price\nFROM items\nWHERE price > 10;"],
  ["html", "<ul class=\"list\">\n  <li>One</li>\n</ul>"],
  ["css", ".list {\n  display: grid;\n}"],
];
const langs: SceneModule = {
  build(ctx) {
    return SAMPLES.map(([lang, src], i) =>
      code(ctx, { src, lang, x: 60 + (i % 3) * 610, y: 140 + Math.floor(i / 3) * 280, w: 580, h: 250 }),
    );
  },
  steps: [(tl, hs: CodeHandle[]) => hs.forEach((h) => h.show(tl))],
};

const LONG = Array.from({ length: 40 }, (_, i) => `const line${i + 1} = ${i + 1};`).join("\n");
const TWENTY = Array.from({ length: 20 }, (_, i) => `x${i + 1} = ${i + 1}`).join("\n");

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Code\n",
      "sections/10-a/10-walk/scene.md": `## Walk\n\n${f}js {1-2|3-5|6}\n${WALK}\n${f}\n\n- Start at zero.\n- Add each price.\n- Return the sum.\n`,
      "sections/10-a/20-diff/scene.md": "## Diff\n\n- Show.\n- Focus line 2.\n- Diff.\n- Focus the new line.\n- Unfocus.\n",
      "sections/10-a/30-langs/scene.md": "## Languages\n\n- Every bundled language.\n",
      "sections/10-a/40-long/scene.md": `## Long\n\n${f}ts\n${LONG}\n${f}\n\n- Forty lines.\n`,
      "sections/10-a/50-bad/scene.md": `## Bad groups\n\n${f}python {0-2|4-2|1-99999999}\n${TWENTY}\n${f}\n\n- Line 0.\n- Reversed.\n- Huge.\n`,
    },
    {
      "sections/10-a/20-diff/scene.ts": diff,
      "sections/10-a/30-langs/scene.ts": langs,
    },
  );
