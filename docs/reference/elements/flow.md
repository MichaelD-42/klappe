# Flow diagram: `flow`

Boxes on a grid joined by orthogonal arrows. Boxes and arrows fade in, a box can be ringed in the accent colour, and packets (dots) travel the arrows with each box pulsing on arrival. Packets are timeline tweens, so they seek like everything else.

Gallery: section `170-flow` (`#/flow/pipeline/1`, `#/flow/send/2`, `#/flow/callout/2`, `#/flow/long/1`).

## `flow`

Only in `scene.ts`. From `decks/gallery/sections/170-flow/10-pipeline/scene.ts`:

```ts
import { flow, type FlowHandle } from "klappe/fx";

build: (ctx) => ({
  f: flow(ctx, {
    grid: { x: 160, y: 140, w: 1600, h: 760, cols: 4, rows: 2 },
    nodes: [
      { id: "web", label: "Web app", col: 0, row: 0, icon: "monitor" },
      { id: "api", label: "API", col: 1, row: 0, icon: "server" },
    ],
    edges: [{ from: "web", to: "api", label: "HTTPS" }],
  }),
}),
steps: [(tl, r: { f: FlowHandle }) => r.f.show()(tl), (tl, r) => r.f.highlight(["api"])(tl)],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `grid` | `{ x, y, w, h, cols, rows }` | required | the area, split into `cols` x `rows` cells; a node's `col` and `row` pick a cell (from 0) and the box fills 70% of it, centred |
| `nodes` | `{ id, label, col, row, icon? }[]` | required | boxes (`--k-surface` fill, 3px `--k-line` border); `icon` is a Lucide name |
| `edges` | `{ from, to, label? }[]` | required | arrows between node ids; an unknown id throws `flow: unknown node "<id>"` |

### Step adders

Each method returns a step adder: call it with the timeline, `r.f.show()(tl)`.

| Handle | Step |
| --- | --- |
| `show(ids?)` | the boxes in `ids` (default all) fade in, then every arrow whose two ends are both shown; boxes and arrows shown before stay as they are |
| `highlight(ids)` | an `--k-accent` ring fades in on those boxes and off the ones highlighted before |
| `send({ path, count?, label? })` | `count` (default 1) packets, 0.25 s apart, travel the boxes of `path` (ids, in order) from centre to centre, 0.6 s per leg, resting 0.3 s at each box; a box pulses on each arrival; `label` rides above each packet |
| `node(id)` | not a step: the box element, as a `callout` target |

### Limits

- Labels wrap and shrink from 32 px to the 20 px floor. A label that still needs more than 3 lines at the floor shows `flow: label of "<id>" too long`; the box stays and the text is not cut.
- Labels are measured when the first step is added, so the layout must exist then.
- `callout` needs the target in its final position when its `show` is added: boxes never move, so `callout(ctx, { target: f.node("api"), … })` works at any point; see the callout entry.
- Edges are drawn from box edge to box edge as one straight line on a shared row or column, otherwise horizontal, vertical, horizontal. Two edges can overlap on a shared segment; move a node to separate them.
- A packet rests at the centre of a box, over its label, for 0.3 s.

## `edgePath`

`edgePath(a, b)` gives the SVG path data (`"M x y L x y …"`) of the route from box `a` to box `b`, each a `{ x, y, w, h }`. Same row: one horizontal line between the facing edges. Same column: one vertical line. Otherwise: out of the side of `a` that faces `b`, vertical at the midpoint of the gap, into `b`. Boxes of size 0 give centre-to-centre paths.
