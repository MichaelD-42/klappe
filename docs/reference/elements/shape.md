# Shapes, arrows and colour tweens: `shape`, `arrow`, `tint`, `token`

A rectangle, circle, line or arrow on `ctx.svg`, for a small diagram of your own, without `createElementNS`. The stroke is `--k-line`, or `--k-accent` with `accent: true`, 4 px, round caps, no fill. Each shape is hidden at load until its `draw` or `show` step. For boxes joined by routed arrows with packets, use [flow](flow.md).

`tint` and `token` let a colour tween start and end on theme tokens: GSAP cannot tween `var(--k-…)`.

Catalog: section `125-shapes` (`#/shapes/diagram/5`).

## `shape`

Only in `scene.ts`. Shortened from `decks/demo/sections/125-shapes/10-diagram/scene.ts` (the box labels left out):

```ts
import { arrow, shape, tint, token, type ShapeHandle } from "klappe/fx";

build: (ctx) => ({
  boxes: [260, 1220].map((x) => shape(ctx, { kind: "rect", x, y: 340, w: 440, h: 240 })),
  link: arrow(ctx, { from: { x: 730, y: 460 }, to: { x: 1140, y: 460 }, curve: 0.15, accent: true }),
  ring: shape(ctx, { kind: "circle", x: 1440, y: 460, r: 280 }), // the demo sets its stroke to var(--k-fg), where its tint starts
}),
steps: [
  (tl, r) => r.boxes.forEach((b) => b.draw(tl)),
  (tl, r) => r.link.draw(tl),
  (tl, r) => r.ring.show(tl),
],
```

Call `shape` and `arrow` in `build`, so the shapes exist at load; the steps only use what they return.

### Options

| Name       | Type                               | Default               | Meaning                                                                     |
| ---------- | ---------------------------------- | --------------------- | --------------------------------------------------------------------------- |
| `kind`     | `"rect"` \| `"circle"` \| `"line"` | (required)            | the shape                                                                   |
| `x`, `y`   | number                             | (required)            | rect: the top-left corner; circle: the centre; line: the start. Scene-local |
| `w`, `h`   | number                             | (required for rect)   | the rect's size                                                             |
| `r`        | number                             | (required for circle) | the radius                                                                  |
| `x2`, `y2` | number                             | (required for line)   | the line's end                                                              |
| `accent`   | boolean                            | `false`               | stroke in `--k-accent` instead of `--k-line`                                |

### Step adders

| Handle | Step                                                |
| ------ | --------------------------------------------------- |
| `draw` | the shape draws on from its start, 0.9 s (`drawOn`) |
| `show` | the shape fades in, 0.6 s                           |

The handle's `el` is the shape's `<g>`, for a tween of your own (move it, or tween its `stroke` with `token`).

## `arrow`

`arrow(ctx, { from, to, curve?, accent? })`: a connector from one point to another, with a head of two strokes at `to`. It returns the same handle as `shape`: `draw` draws the shaft, 0.9 s, and the head draws on in 0.3 s as the shaft arrives (from 0.8 s); `show` fades the whole arrow in.

| Name         | Type       | Default    | Meaning                                                                                                 |
| ------------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| `from`, `to` | `{ x, y }` | (required) | the tail and the tip, scene-local                                                                       |
| `curve`      | number     | `0`        | how far the curve bends, as a share of the length (the bend's widest point is half this): `0.2` bends to the left of the way the arrow points, `-0.2` to the right |
| `accent`     | boolean    | `false`    | stroke in `--k-accent` instead of `--k-line`                                                            |

## `tint`

`tint(el, { to, prop? }, ctx?)` returns a step adder that tweens one colour property of `el` from its current colour to the theme token `to`, 0.6 s. From the demo:

```ts
accent: tint(labels[1], { to: "--k-accent" }, ctx), // in build
// …
(tl, r) => r.accent(tl),
```

| Name   | Type                                                                          | Default    | Meaning                       |
| ------ | ----------------------------------------------------------------------------- | ---------- | ----------------------------- |
| `to`   | string                                                                        | (required) | a theme token, `"--k-accent"` |
| `prop` | `"color"` \| `"fill"` \| `"stroke"` \| `"borderColor"` \| `"backgroundColor"` | `"color"`  | the property to tween         |

Both colours are read when the step is added, at load. A second `tint` on the same element and property starts where the first ends, in step order. An unknown token keeps the colour as it is; with `ctx` it also reports `tint: unknown token '--k-nope'`. To pass `ctx`, make the adder in `build`, as the demo does.

## `token`

`token(el, name)` returns the resolved value of a theme token at `el`, such as `"#4da3ff"` for `"--k-accent"` in the calm theme, or `""` for an unknown token. Use it for the ends of a colour tween of your own. Read it in `build` or in a step function, never in an `onUpdate`. From the demo:

```ts
(tl, r) => void tl.fromTo(r.ring.el, { stroke: token(r.ring.el, "--k-fg") }, { stroke: token(r.ring.el, "--k-warn"), duration: 0.6, immediateRender: false }),
```

## Limits

- No fill, no corner radius, no dash and no stroke width option: for more, build the SVG yourself and draw it with `drawOn`.
- With reduced motion the shapes still draw on, as `lineArt` does: a stroke reveal does not move anything.
