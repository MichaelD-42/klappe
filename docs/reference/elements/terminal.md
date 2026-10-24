# Terminal replay: `terminal`

Replays a terminal session: each step types one command and fades in its output lines. No CRT effects: a plain panel with an accent prompt.

Catalog: section `250-terminal` (`#/terminal/replay/1` and `#/terminal/prompt/1`).

## Markdown

A `console` fence in `scene.md`. Lines starting with `$ ` are commands, the lines after them their output; each list item after the block is one command's step, in order. From `decks/demo/sections/250-terminal/10-replay/scene.md`:

````md
```console
$ npm test
12 passed
$ npm run build
compiling 48 files
done in 2.1 s
```

- Run the tests.
- Build the site.
````

## scene.ts

From `decks/demo/sections/250-terminal/20-prompt/scene.ts`:

```ts
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
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `lines` | string[] | required | `"$ "` lines are commands, the rest output; output before the first command is ignored |
| `x`, `y`, `w`, `h` | number | required | the panel's corner and the most room it may take, in scene units |
| `prompt` | string | `"$"` | the prompt glyph shown before each command |

### Step adders

| Handle | Step |
| --- | --- |
| `show` | the panel fades in, empty |
| `run(command)` | types command `command` (0-based) at 34 characters a second, then fades in its output lines 0.08 s apart. Throws if there is no such command |

Colours come from the theme: the panel is `--k-surface`, text `--k-fg`, the prompt `--k-accent`. The font is `--k-font-code`. A deep link onto command 2 shows command 1 and its output complete.

### Limits

- The font starts at 30 px and shrinks to fit the lines into `h` and the longest line into `w`, down to 20 px (14 px at 1366×768). Past that the panel clips, its last row reads "+N more lines" in `--k-muted`, and the deck shows a problem: `terminal: N lines do not fit; max M`, or `terminal: lines longer than C characters are clipped`.
- One code or console block per scene in Markdown.

## `splitConsole`

`splitConsole(lines)` groups console lines into `{ cmd, out }`: `cmd` is a `"$ "` line without the prompt, `out` the lines after it. `splitConsole(["stray", "$ a", "x"])` gives `[{ cmd: "a", out: ["x"] }]`.
