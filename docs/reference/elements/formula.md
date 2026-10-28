# Formula: `formula`

A typeset equation (KaTeX) that builds term by term, for technical trainings: `show` sets the frame, each `next()` fades in the next term you marked with `\step{…}`. The formula takes the deck's `--k-fg`. KaTeX and its fonts ship with klappe and load only for a deck whose code imports `formula`.

Catalog: section `240-code` (`#/code/formula/1`).

## `formula`

Only in `scene.ts`. From `decks/demo/sections/240-code/40-formula/scene.ts`:

```ts
import { formula, type FormulaHandle } from "klappe/fx";

build: (ctx) => formula(ctx, { tex: String.raw`P(A \mid B) = \frac{\step{P(B \mid A)}\,\step{P(A)}}{\step{P(B)}}`, x: 160, y: 300, w: 1600, h: 560, size: 96 }),
steps: [(tl, f: FormulaHandle) => f.show(tl), (tl, f) => f.next()(tl), (tl, f) => f.next()(tl), (tl, f) => f.next()(tl)],
```

Write the TeX in `String.raw` so its backslashes stay as written.

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `tex` | string | required | the equation in TeX, as KaTeX reads it, in display style. `\step{…}` marks a term that shows on its own step |
| `x`, `y`, `w`, `h` | number | required | the box the formula is centred in, scene units |
| `size` | number | `64` | the font size, scene px; it shrinks in steps of 2 to fit the box, down to 30 so sub- and superscripts stay legible |

### Step adders

| Handle | Step |
| --- | --- |
| `show` | the formula fades in without its `\step` terms |
| `next()` | the next `\step` term fades in, in reading order (as KaTeX lays the terms out). Terms show in order, in step order, whichever adder was made first. A `\step` inside another shows with the outer one |

### Limits

- `\step` is the only command that needs trust: links, ids, styles and other `\html…` commands in `tex` are refused as KaTeX errors.
- TeX that KaTeX cannot parse shows as written in `--k-warn` and reports `formula: KaTeX parse error: …`.
- A formula that does not fit its box at 30 px reports `formula: does not fit <w> x <h> at 30px; split it or widen the rect`.
- A `next()` past the last term reports `formula: next() past the last \step term (<n> terms)` and holds a beat.

## `loadKatex`

Engine only: `loadParts` awaits it before the world renders when the deck's code imports `formula`. It loads KaTeX and its stylesheet once; if that fails, formulas show as TeX with a problem.
