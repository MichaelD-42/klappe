# Hand-drawn marks: `annotate`

A mark on a target, as a pen on a whiteboard would make it: a ring, an underline, a frame, a strike-through, an arrow, a highlighter band, a curly bracket or a cross, drawn on in `--k-accent` (a cross in `--k-bad`) with a slight hand wobble. It sits above the scene's text, so it can mark words; a highlight sits behind the text instead.

Catalog: section `120-draw` (`#/draw/annotate/2`; the highlight is step 5, `#/draw/annotate/5`; the cross and the bracket are steps 7 and 8, `#/draw/annotate/8`).

## `annotate`

Only in `scene.ts`. From `decks/demo/sections/120-draw/40-annotate/scene.ts`:

```ts
import { annotate, type AnnotateHandle } from "klappe/fx";

build: (ctx) => ({ ring: annotate(ctx, span, { kind: "circle" }), arrow: annotate(ctx, other, { kind: "arrow", side: "top" }) }),
steps: [(tl, r) => r.ring.show(tl), (tl, r) => r.arrow.show(tl)],
```

`annotate(ctx, target, opts)`: `target` is an element, measured by its content (a code line's text, not the whole row), or a rect `{ x, y, w, h }` in scene units.

### Options

| Name   | Type                                                                     | Default  | Meaning                                                                                                                                                                                                                                                                                                                                                                                  |
| ------ | ------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind` | `"circle"`, `"underline"`, `"box"`, `"strike"`, `"arrow"`, `"highlight"`, `"bracket"`, `"cross"` | required | `circle`: a rounded loop round the target, a little over one turn. `underline` and `strike`: a stroke under or through each line of the target. `box`: a quick frame with overshooting corners. `arrow`: a 160-unit arrow from `side` to the target's edge. `highlight`: a marker band behind each line of the target, 80 % of the line's height, its ends leaning like a chisel marker's, in its colour at 35 % over the stage. `bracket`: a curly brace along the target's `side`, its tip 26 units out at the middle, to group a run of lines. `cross`: an X over the whole target, corner to corner, for "wrong" |
| `side` | `"left"`, `"right"`, `"top"`, `"bottom"` | `"left"` | `arrow`: where it comes from. `bracket`: the side it stands on |
| `color` | string | `"--k-accent"`; `"--k-bad"` for a cross | a `--k-*` token name for the stroke (or the band); anything else reports `annotate: color "<value>" is not a --k-* token name` and keeps the default |
| `pad`  | number                                                                   | 12       | scene units between the target and the mark                                                                                                                                                                                                                                                                                                                                              |
| `seed` | number                                                                   | 1        | picks the wobble; the same seed draws the same mark on every load                                                                                                                                                                                                                                                                                                                        |

### Step adders

| Handle | Step                                                              |
| ------ | ----------------------------------------------------------------- |
| `show` | the mark draws on (`drawOn`), 0.45 s per stroke, 0.7 s for a ring |
| `hide` | it fades out                                                      |

### Limits

- An element target is measured when `show` is added: it must be in its final place by then. One with no size reports `annotate: <kind> target has no size to measure`.
- A ring on a code line (`code`'s `line(n)` or a span in it) flattens to the line gap and widens instead, so it stays off the lines above and below. Elsewhere a ring is as tall as its pad makes it: on dense prose it can reach the lines around it, so use `box`, `underline` or `strike` with a small `pad` there.
- A target that wraps: `underline`, `strike` and `highlight` follow each line; `circle`, `box`, `arrow`, `bracket` and `cross` take the whole. To bracket several elements, put them in one block and mark that (`#/draw/annotate/8`).
- A highlight paints behind its target's top-level element in the scene. That element must be positioned (`position: absolute` or `relative`); scene text already is. On an element with its own background, such as a card, the band is hidden. On a rect target it goes behind everything in the scene.
- `--k-fg` on a highlight holds 6.3:1 or more in every built-in theme with the default `--k-accent`; with another `color`, or a custom theme with a very bright accent, check it yourself.

## `scribble`

`scribble(kind, box, { pad, seed, side?, room? })` gives the mark's polylines, `{ x, y }[][]`, in drawing order: one for most kinds, two for a cross, three for an arrow (shaft, then the two head strokes). `room` caps a ring's reach above and below the box's middle (`annotate` passes a code line's gap). It is pure; tests use it to check the shapes.

## `MARKER_MIX`

`MARKER_MIX` is 0.35, the share of `--k-accent` in a highlight band over the stage. Tests use it to check that `--k-fg` on the band holds 6.3:1.
