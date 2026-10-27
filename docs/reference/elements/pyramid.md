# Pyramid: `pyramid`

A test pyramid, a funnel-shaped stack or a capability stack: layers with labels inside, built bottom-up one per step. The newest layer is in the accent; it settles when the next one builds. Once built, `light(id)` puts any layer back in the accent, for "we are weak here".

Catalog: section `297-venn-pyramid` (`#/venn-pyramid/layers/1`; `light` at `#/venn-pyramid/layers/5`; the inverted shape at `#/venn-pyramid/hiring/1`).

## `pyramid`

Only in `scene.ts`. Shortened from `decks/demo/sections/297-venn-pyramid/20-layers/scene.ts`:

```ts
import { pyramid, type PyramidHandle } from "klappe/fx";

build: (ctx) => ({
  p: pyramid(ctx, {
    x: 585, y: 300, w: 750, h: 560,
    layers: [{ id: "unit", label: "Unit" }, { id: "integration", label: "Integration" }, { id: "e2e", label: "End to end" }],
  }),
}),
steps: [
  (tl, r: { p: PyramidHandle }) => r.p.next()(tl),
  (tl, r) => r.p.next()(tl),
  (tl, r) => r.p.next()(tl),
],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `x`, `y`, `w`, `h` | numbers | required | the area; the layers fill its height with 8 px between them |
| `layers` | `{ id, label }[]` | required | bottom layer first, the order they build in. Each label is one line, centred in its layer, in `--k-fg` |
| `shape` | `"pyramid"`, `"inverted"` or `"stack"` | `"pyramid"` | `"pyramid"`: trapezoids from the full width at the bottom to 0.3 of it at the top. `"inverted"`: the other way up, full width at the top, for a funnel-shaped stack; `layers` still list bottom first and build bottom-up. `"stack"`: bars of the full width |

### Step adders

| Handle | Step |
| --- | --- |
| `next()` | builds the next layer up: it grows from its base (0.6 s) and its label fades in. It is in the accent (a 4 px `--k-accent` edge and a `--k-accent` fill at `MARKER_MIX`, 35 %) until the next `next()` starts, then settles to a 2 px `--k-line` edge on `--k-surface`. The layer is picked when the step is added, so adders made out of step order still build bottom-up. One `next()` more than there are layers shows `pyramid: next() past the top layer (<n> layers)` and its step only takes a 0.4 s beat |
| `light(id)` | puts built layer `id` in the accent and settles the one lit before (the newest, or an earlier `light`), 0.6 s; `light(null)` settles it with none lit. A `next()` after it settles the lit layer as usual. An unknown id shows `pyramid: light("<id>"): no such layer`, a layer no step has built yet `pyramid: light("<id>"): the layer is not built yet`; either step takes a 0.4 s beat |

### Reduced motion

With `?reducedmotion=1` (or the viewer's setting) a layer fades in at full size instead of growing.

### Limits

- Labels shrink from 28 px to the 20 px floor to fit the narrower top edge of their layer, less 16 px each side. One still too wide shows `pyramid: label of "<id>" too long`; the text is not cut. Fitting happens when the first step is added.
- An empty `layers` throws `pyramid: no layers`.

## `pyramidLayout`

`pyramidLayout({ x, y, w, h }, n, shape?)` gives one entry per layer, bottom first: `{ points, label }`, its four corners (bottom left, bottom right, top right, top left) and its label box, which is inside the layer's narrower edge. It is what `pyramid` draws; tests use it to check that the layers tile the area and each label sits inside its layer.
