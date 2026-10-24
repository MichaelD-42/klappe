# Hand-drawn marks: `annotate`

A mark on a target, as a pen on a whiteboard would make it: a ring, an underline, a frame, a strike-through or an arrow, drawn on in `--k-accent` with a slight hand wobble. It sits above the scene's text, so it can mark words.

Catalog: section `120-draw` (`#/draw/annotate/2`).

## `annotate`

Only in `scene.ts`. From `decks/demo/sections/120-draw/40-annotate/scene.ts`:

```ts
import { annotate, type AnnotateHandle } from "klappe/fx";

build: (ctx) => ({ ring: annotate(ctx, span, { kind: "circle" }), arrow: annotate(ctx, other, { kind: "arrow", side: "top" }) }),
steps: [(tl, r) => r.ring.show(tl), (tl, r) => r.arrow.show(tl)],
```

`annotate(ctx, target, opts)`: `target` is an element, measured by its content (a code line's text, not the whole row), or a rect `{ x, y, w, h }` in scene units.

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `kind` | `"circle"`, `"underline"`, `"box"`, `"strike"`, `"arrow"` | required | `circle`: a rounded loop round the target, a little over one turn. `underline` and `strike`: a stroke under or through each line of the target. `box`: a quick frame with overshooting corners. `arrow`: a 160-unit arrow from `side` to the target's edge |
| `side` | `"left"`, `"right"`, `"top"`, `"bottom"` | `"left"` | `arrow` only: where it comes from |
| `pad` | number | 12 | scene units between the target and the mark |
| `seed` | number | 1 | picks the wobble; the same seed draws the same mark on every load |

### Step adders

| Handle | Step |
| --- | --- |
| `show` | the mark draws on (`drawOn`), 0.45 s per stroke, 0.7 s for a ring |
| `hide` | it fades out |

### Limits

- An element target is measured when `show` is added: it must be in its final place by then. One with no size reports `annotate: <kind> target has no size to measure`.
- On dense code, a ring reaches the lines above and below; use `box`, `underline` or `strike` with a small `pad` there.
- A target that wraps: `underline` and `strike` follow each line; `circle`, `box` and `arrow` frame the whole.

## `scribble`

`scribble(kind, box, { pad, seed, side? })` gives the mark's polylines, `{ x, y }[][]`, in drawing order: one for most kinds, three for an arrow (shaft, then the two head strokes). It is pure; tests use it to check the shapes.
