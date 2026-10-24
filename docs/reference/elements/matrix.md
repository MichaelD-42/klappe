# Matrix: `matrix`

A 2×2: an x and a y axis with titles, four quadrants with optional names, and items placed in a quadrant one step at a time. Placing an item again in another quadrant moves it there.

Catalog: section `295-matrix` (`#/matrix/priorities/1`).

## `matrix`

Only in `scene.ts`. From `decks/demo/sections/295-matrix/10-priorities/scene.ts`:

```ts
import { matrix, type MatrixHandle } from "klappe/fx";

build: (ctx) => ({
  m: matrix(ctx, {
    x: 160, y: 140, w: 1600, h: 760,
    axes: { x: "Effort", y: "Impact" },
    quadrants: { tl: "Quick wins", tr: "Big bets", bl: "Fill-ins", br: "Money pits" },
    items: [{ id: "sso", label: "Single sign-on" }, { id: "dark", label: "Dark mode" }],
  }),
}),
steps: [
  (tl, r: { m: MatrixHandle }) => r.m.show(tl),
  (tl, r) => r.m.place("sso", "tr")(tl),
  (tl, r) => r.m.place("dark", "bl")(tl),
  (tl, r) => r.m.place("sso", "tl")(tl),
],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `x`, `y`, `w`, `h` | numbers | required | the area; the left 56 px hold the y title and the bottom 56 px the x title, the rest is the plot |
| `axes` | `{ x, y }` | required | the axis titles, 26 px: `x` under the plot, `y` up its left side. The axes point from low (bottom left) to high |
| `quadrants` | `{ tl?, tr?, bl?, br? }` | none | quadrant names, one line, 24 px in `--k-muted`, at the quadrant's top, 32 px in from its side (left-aligned on the left, right-aligned on the right) |
| `items` | `{ id, label }[]` | required | the items; all are built hidden and appear when first placed |

### Step adders

| Handle | Step |
| --- | --- |
| `show` | a step adder itself (`r.m.show(tl)`): the axes and the dividers draw on with `drawOn`, then the arrowheads, titles and quadrant names fade in |
| `place(id, quadrant)` | `quadrant` is `"tl"`, `"tr"`, `"bl"` or `"br"`. The first time, the item fades in at the lowest free slot of that quadrant. Later, it moves there from its old slot, 0.6 s. Placed in the quadrant it is already in, it stays put. The item has a 4 px `--k-accent` border during its step (its 2 px border and a 2 px outline, so nothing moves) and settles to a 2 px `--k-line` border when the next `place` starts. An unknown id throws `matrix: unknown item "<id>"`, an unknown quadrant `matrix: unknown quadrant "<q>"` |

### Limits

- Each quadrant has a fixed grid of slots, two columns filled row by row under the name band: 6 per quadrant at the catalog's 1600×760. Placing one more shows `matrix: quadrant "<q>" is full` and puts the item on the last slot, over the item there.
- Items that stay keep their slot: when one leaves, the others do not close the gap. The next item placed in that quadrant fills it.
- Item labels wrap and shrink from 26 px to the 20 px floor. One that still needs more than 2 lines shows `matrix: label of "<id>" too long`; a quadrant name wider than its quadrant at 20 px shows `matrix: name of quadrant "<q>" too long`. The text is not cut. Fitting happens when the first step is added.
- Axis titles are not fitted: keep them to a few words.

## `matrixLayout`

`matrixLayout({ x, y, w, h })` gives `{ plot, quads, slots }`: the plot rect, the rect of each quadrant and each quadrant's slot rects, in fill order. It is what `matrix` draws; tests use it to check that slots stay in their quadrant and do not overlap.
