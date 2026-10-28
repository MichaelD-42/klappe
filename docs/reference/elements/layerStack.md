# Layer stack: `layerStack`

An architecture as stacked layers: isometric slabs, each in its series colour with its label to the right. The stack shows whole, pulls apart so each layer can be talked through, lights one layer at a time with its note, and closes up again. For "our system in four layers". `pyramid` narrows to the top; a layer stack does not.

Catalog: section `297-venn-pyramid` (`#/venn-pyramid/layer-stack/3`).

## `layerStack`

Only in `scene.ts`. From `decks/demo/sections/297-venn-pyramid/40-layer-stack/scene.ts`:

```ts
import { layerStack, type LayerStackHandle } from "klappe/fx";

build: (ctx) => ({
  s: layerStack(ctx, {
    x: 260, y: 120, w: 1400, h: 760,
    layers: [
      { label: "Apps", note: "Web, mobile and the admin console" },
      { label: "Services", note: "One per business capability" },
      { label: "Data", note: "Each service owns its store" },
      { label: "Platform", note: "Kubernetes, queues, observability" },
    ],
  }),
}),
steps: [
  (tl, r: { s: LayerStackHandle }) => r.s.show(tl),
  (tl, r) => r.s.apart(tl),
  (tl, r) => r.s.light(1)(tl),
  (tl, r) => r.s.together(tl),
],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `layers` | `{ label, note? }[]` | required | the layers, the top one first. Layer `i` takes `--k-series-(i+1)`, mixed into `--k-surface` darker on the side faces; past six the colours repeat |
| `x`, `y`, `w`, `h` | number | required | the area, scene units. The slabs take the left 45 % of `w`, the labels the rest. Closed, the stack sits on the bottom of the area; apart, it fills the height |

### Step adders

`show`, `apart` and `together` are step adders themselves: `r.s.apart(tl)`. `light` returns one.

| Handle | Step |
| --- | --- |
| `show` | the slabs and their labels fade in, the bottom one first |
| `apart` | the slabs move apart, the top one first, with an even gap; the labels move with them. On an open stack it holds a beat |
| `light(i)` | layer `i` (0 is the top) gets an `--k-accent` outline and its note shows under its label, in `--k-muted`; the layer lit before goes back. Works open or closed, but a note reads best with the stack open |
| `together` | the light goes out and the slabs close up. On a closed stack it holds a beat |

### Limits

- A slab is at least 36 units thick. Too many layers for `h` report `layerStack: <n> layers do not fit <h>px; use fewer layers or a taller rect`.
- A label keeps one line and shrinks from 28 px to the 20 px floor; one still too long reports `layerStack: label "<label>" too long` and ends in an ellipsis. Fitting happens when the first step is added. A note wraps, at 22 px.
- `light(i)` outside the layers reports `layerStack: no layer <i>; the layers are 0 to <last>`.
- The slabs move with reduced motion too: the opening is the message.

## `layerStackLayout`

`layerStackLayout(n, rect)` gives the geometry `layerStack` draws: `a` (half a slab's width), `c` (half its top face's height), `t` (its thickness), `cx`, `labelX`, `labelW`, and `together[i]` and `apart[i]`, the y of layer `i`'s top corner closed and open, plus `problems`. Its unit test uses it.
