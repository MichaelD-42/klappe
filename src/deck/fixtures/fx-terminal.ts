import { assembleDeck } from "../assemble";
import { terminal, type TerminalHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// The terminal replay: a Markdown console fence (two commands with output), a scene.ts with a custom prompt and
// every handle method, a 30-line block that does not fit (the problem the fixture means to cause), and a wrapped
// 143-character command with no output, shown at a position.
const f = "```";

const api: SceneModule = {
  build: (ctx) => terminal(ctx, { lines: ["$ git status", "clean", "$ git log -1", "abc123 first", "second"], x: 160, y: 200, w: 1200, h: 500, prompt: ">" }),
  steps: [
    (tl, h: TerminalHandle) => {
      h.show(tl);
      h.run(0)(tl);
    },
    (tl, h: TerminalHandle) => h.run(1)(tl),
  ],
};

const long: SceneModule = {
  build: (ctx) =>
    terminal(ctx, { lines: ["$ seq 30", ...Array.from({ length: 29 }, (_, i) => String(i + 1))], x: 160, y: 200, w: 1200, h: 500 }),
  steps: [(tl, h: TerminalHandle) => (h.show(tl), h.run(0)(tl))],
};

// 143 characters: past the 20 px floor in this 1200-wide panel, so it wraps instead of clipping.
const LONG_CMD =
  "irm https://example.com/training/setup.ps1 -OutFile setup.ps1; ./setup.ps1 -Workspace C:/workspace/training -Proxy http://127.0.0.1:3128 -Quiet";
const wrap: SceneModule = {
  build: (ctx) => terminal(ctx, { lines: [`$ ${LONG_CMD}`, "$ ls", "setup.ps1"], x: 160, y: 200, w: 1200, h: 500, wrap: true }),
  steps: [(tl, h: TerminalHandle) => (h.show(tl, 0), h.run(0)(tl)), (tl, h: TerminalHandle) => h.run(1)(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Terminal\n",
      "sections/10-a/10-run/scene.md": `## Run\n\n${f}console\n$ npm test\n3 passed\n$ npm run build\ncompiling\ndone\n${f}\n\n- Test.\n- Build.\n`,
      "sections/10-a/20-api/scene.md": "## API\n\n- Show and run the first command.\n- Run the second.\n",
      "sections/10-a/30-long/scene.md": "## Long\n\n- Thirty lines.\n",
      "sections/10-a/40-wrap/scene.md": "## Wrap\n\n- A long command.\n- A short one.\n",
    },
    { "sections/10-a/20-api/scene.ts": api, "sections/10-a/30-long/scene.ts": long, "sections/10-a/40-wrap/scene.ts": wrap },
  );
