# Code walkthrough: `code`

Shows a block of syntax-highlighted code and walks through it step by step: each step focuses some lines and dims the rest, and a diff morphs the code into a new version.

Gallery: section `140-code` (`#/code/walkthrough/1` and `#/code/diff/1`).

## Markdown

A fenced block with a language in `scene.md`. Highlight groups after the language, in the reveal.js and Slidev convention, make one step each; the list items after the block are those steps' text, in order. From `decks/gallery/sections/140-code/10-walkthrough/scene.md`:

````md
```js {1-2|3-5|6}
function total(items) {
  let sum = 0;
  for (const item of items) {
    sum += item.price;
  }
  return sum;
}
```

- A fenced block with {1-2|3-5|6} in scene.md: each group focuses its lines, one step each
- The loop adds each price.
- The function returns the sum.
````

A group is a comma list of lines and ranges: `{1,3-5|8}`. A block without groups is one step that shows the code unfocused. The code takes the right column of the scene and the step text the left.

## scene.ts

From `decks/gallery/sections/140-code/20-diff/scene.ts`:

```ts
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
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `src` | string | required | the code; one trailing newline is dropped |
| `lang` | string | required | a language in `LANGS`; any other shows plain, uncoloured text |
| `x`, `y`, `w` | number | required | the panel's top-left corner and width, in scene units |
| `h` | number | to the scene's bottom | the most height the panel may take; it is as tall as its lines, up to `h` |

### Step adders

| Handle | Step |
| --- | --- |
| `show` | the panel fades in, all lines unfocused |
| `focus(lines)` | the 1-based `lines` go to full opacity with an accent bar on the left; the others dim to 0.35. `focus([])` unfocuses everything |
| `diff(newSrc)` | morphs to `newSrc` by a line diff: removed lines fade and collapse, added lines grow in, kept lines slide to their new place. The result shows unfocused; later `focus` calls number the new lines |
| `line(n)` | not a step: the element of line `n` (1-based, current version), as a callout target |

Colours come from the theme: the panel is `--k-surface`, text `--k-code-foreground`, syntax `--k-code-token-*`, the focus bar `--k-accent`. The font is `--k-font-code`.

### Limits

- The font starts at 30 px and shrinks to fit the lines into `h` and the longest line into `w`, down to 20 px (14 px at 1366×768). Past that the panel clips and the deck shows a problem: `code: N lines do not fit; max M`, or `code: lines longer than C characters are clipped`.
- A focus line outside the code reports `code: line 0 out of range (1-20)`; a reversed range such as `{4-2}` reports `code: lines 4, 3, 2 out of order; write ranges low to high` and still focuses lines 2 to 4.
- One code or console block per scene in Markdown. In `scene.ts`, any number of panels.

## `LANGS`

The bundled languages: `ts`, `js`, `python`, `bash`, `json`, `yaml`, `sql`, `html`, `css`. A Markdown fence in any other language shows plain and reports `language "<lang>" not bundled; shown plain`.

## `loadHighlighter`

Shiki's one-time async init (JavaScript regex engine, the bundled languages, a `css-variables` theme with the prefix `--k-code-`). klappe awaits it before the deck renders; deck code never calls it. If it fails, it logs one console error and code shows plain text: the deck never goes blank.

## `parseGroups`

`parseGroups("1-2|4")` gives `[[1, 2], [4]]`: the highlight groups of a fence info string, one per step. Ranges expand only up to `MAX_LINES`; an end beyond it and a line 0 stay in the group, and a reversed range lists high to low, so `code()` can report them.

## `MAX_LINES`

999: the longest range `parseGroups` expands, so `{1-99999999}` stays small.

## `lineDiff`

`lineDiff(a, b)` compares two arrays of lines by longest common subsequence and returns the operations in order: `{ op: "keep", from, to }`, `{ op: "del", from }` and `{ op: "add", to }`, with 0-based indexes. At a fork, deletions come first. `lineDiff(["a","b","c"], ["a","c","d"])` gives keep 0→0, del 1, keep 2→1, add 2. `diff` plays these.
