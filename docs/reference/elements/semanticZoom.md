# Semantic zoom: `semanticZoom`

Boxes in boxes (systems, their containers, their components), nested on the canvas. `into` flies the camera into one box: the rest of its level fades, and the box's insides build as it lands. `out` flies back up a level. Every level's labels read 32 px on screen at their own zoom, so a deeper level is not smaller, only closer.

Catalog: section `172-semantic-zoom` (`#/semantic-zoom/system/2`, `#/semantic-zoom/system/3`).

## `semanticZoom`

Only in `scene.ts`. From `decks/demo/sections/172-semantic-zoom/10-system/scene.ts`:

```ts
import { semanticZoom, type SemanticZoomHandle } from "klappe/fx";

build: (ctx) => ({
  z: semanticZoom(ctx, {
    x: 160, y: 120, w: 1600, h: 760,
    boxes: [
      { label: "Online shop", children: [{ label: "Web app" }, { label: "API", children: [{ label: "Orders" }, { label: "Payments" }] }] },
      { label: "Warehouse" },
    ],
  }),
}),
steps: [
  (tl, r: { z: SemanticZoomHandle }) => r.z.show(tl),
  (tl, r) => r.z.into(["Online shop"])(tl),
  (tl, r) => r.z.into(["Online shop", "API"])(tl),
  (tl, r) => r.z.out(tl),
],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `boxes` | `ZoomBox[]` | required | the top level; `ZoomBox` is `{ label, children?: ZoomBox[] }`, as deep as you like |
| `x`, `y`, `w`, `h` | numbers | required | the area of the top level, scene-local |
| `links` | `{ from, to }[]` | none | arrows between two boxes of one level, each a path of labels as for `into`. A link draws from the edge of `from` to the edge of `to`, in `--k-line`, 3 px on screen at its level, and shows and hides with its level. A level with links spaces its boxes 0.3 of a box's width apart instead of 0.06, so the arrows have room. Two boxes on different levels, or a path that is no box, throw `semanticZoom: link <from> > <to> needs two boxes on one level`. Catalog: `#/semantic-zoom/system/1` |

Each level is a grid of 16:9 boxes, as large as they fit, centred in its area: the top level in `x, y, w, h`, a box's children under its label. A box with children has its label at the top left; a leaf has it in the middle. Boxes are `--k-surface` with a `--k-line` border, 3 px on screen at their level; the box the camera is in has a `--k-accent` border.

### Step adders

`show` and `out` are step adders themselves: `r.z.show(tl)`. `into` returns one: `r.z.into(["Online shop"])(tl)`.

| Handle | Step |
| --- | --- |
| `show` | the top level fades in, box by box |
| `into(path)` | `path` is the labels from the top. The other boxes of its level and its parent's label fade, the camera flies to the box with a margin, and its children fade in as it lands |
| `out` | the reverse: the children fade, the camera flies back to the parent's view (the scene's frame from the first level), and the level's boxes come back |
| `box(path)` | the box's element, for a `callout` or `annotate` on it. Not a step |

With reduced motion the flights are cuts; the fades stay.

### Limits

- One level at a time: `into` must name a child of the box the camera is in. Otherwise `semanticZoom: into "<path>" from "<box>"; go one level at a time` (or `from the top`); a path with no box `semanticZoom: no box "<path>"`; a box with no children `semanticZoom: "<path>" has nothing inside`; `out` at the top `semanticZoom: out at the top level`.
- A label wider than its box shows `semanticZoom: label "<label>" too long` (checked when the first step is added) and is cut with an ellipsis.
- The camera leaves the scene's frame: anything else in the scene that has text, such as a caption, must fade before `into` and come back after the last `out`, or the walk reports it outside the stage.

## `zoomLayout`

`zoomLayout(boxes, { x, y, w, h }, frameW = 1920, linked = [])` gives every box as `{ id, label, depth, parent?, leaf, font, x, y, w, h }`, ids being the labels from the top joined with `/`, and `font` the label size in scene units that reads 32 px with the camera on its parent. `linked` lists the boxes whose children have links (`""` for the top level); those levels get the wider gap. It is what `semanticZoom` draws; tests use it.

## `zoomView`

`zoomView(rect)` gives the camera's view on a box: the box with a 25 % margin, at 16:9.
