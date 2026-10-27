# Flow diagram: `flow`

Boxes on a grid joined by orthogonal arrows. Boxes and arrows fade in, a box can be ringed in the accent colour, and packets (dots) travel the arrows with each box pulsing on arrival. Packets are timeline tweens, so they seek like everything else.

Catalog: section `270-flow` (`#/flow/pipeline/1`, `#/flow/send/2`, `#/flow/callout/2`, `#/flow/long/1`, and a state machine at `#/flow/state-machine/1`).

## `flow`

Only in `scene.ts`. From `decks/demo/sections/270-flow/10-pipeline/scene.ts`:

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
| `nodes` | `{ id, label, col, row, icon?, kind? }[]` | required | boxes (`--k-surface` fill, 3px `--k-line` border); `icon` is a Lucide name or the icon itself ([icon](../effects.md#icon)). `kind` draws a flowchart symbol instead of the box, in the same fill and border: `"decision"` a diamond, `"store"` a cylinder (stored data), `"terminal"` a pill for a start or an end, at most half as high as it is wide. Arrows meet the symbol's outline, and the highlight ring follows it. Catalog: `#/flow/flowchart/1`. For a person, use `icon: "user"` on a box |
| `edges` | `{ from, to, label? }[]` | required | arrows between node ids; an unknown id throws `flow: unknown node "<id>"`. An edge with `from` equal to `to` is a loop (a state that stays): it leaves and re-enters the box on its first face no other edge uses (top, right, bottom, left), in the cell's gap on that side |

### Step adders

Each method returns a step adder: call it with the timeline, `r.f.show()(tl)`.

| Handle | Step |
| --- | --- |
| `show(ids?)` | the boxes in `ids` (default all) fade in, then every arrow whose two ends are both shown draws on with `drawOn`, one after another; its arrowhead and label appear as the line arrives; things shown before stay as they are |
| `highlight(ids)` | an `--k-accent` ring fades in on those boxes and off the ones highlighted before |
| `send({ path, count?, label? })` | `count` (default 1) packets, 0.45 s apart (longer than the 0.3 s rest, so a box never holds two), 30 px dots travel the boxes of `path` (ids, in order) along each hop's edge, 0.6 s per hop; a packet rests 0.3 s just inside the box where the arrow enters, clear of the label, and the box pulses; `label` rides above the lead packet only. A path under 2 nodes, a hop with no edge, or a hop against an edge's direction is reported as a deck problem (`flow: send needs a path of at least 2 nodes`, `flow: no edge from "a" to "b"`, `flow: edge between "a" and "b" runs from "b" to "a"`) |
| `fire(from, to)` | a state machine's transition: the edge from `from` to `to` draws on in `--k-accent` (each call its own copy, so one edge can fire twice), the edge fired before goes back to `--k-line`, and the ring moves to `to` as the line arrives. Start with `highlight([state])` for the start state. An edge that is not there reports `flow: no edge from "a" to "b"` and only the ring moves |
| `dim(ids)` | those nodes, and every arrow with an end on one of them, fade to 0.35 opacity over 0.6 s; the nodes dimmed before and not in `ids` come back. `dim([])` brings all back. For "this part is out of scope" while you talk about the rest. Add it after `show`. Catalog: `#/flow/flowchart/2` |
| `node(id)` | not a step: the box element, as a `callout` target |

### Limits

- Labels wrap and shrink from 32 px to the 20 px floor. A label that still needs more than 3 lines at the floor shows `flow: label of "<id>" too long`; the box stays and the text is not cut.
- Labels are fitted when the first step is added (the layout exists then, not at build), so a flow needs at least one step for the too-long check to run.
- `callout` needs the target in its final position when its `show` is added: boxes never move, so `callout(ctx, { target: f.node("api"), … })` works at any point; see the callout entry.
- Every edge has its own port on each box face (spread along the face, ordered by where the other end is) and its own middle run, so no two edges share a segment or an arrowhead. Edges still cross boxes and each other where the layout forces it; they are not routed around other boxes.
- A packet disappears at its resting point and reappears at the exit of the next edge: it passes through the box unseen.

## `flowRoutes`

`flowRoutes({ nodes, edges, grid })` gives `{ from, to, points }[]`: the corner points of every edge on the box edges, with ports and lanes assigned as above. It is what `flow` draws; tests use it to check that no two edges overlap.

## `shapeEdge`

`shapeEdge(kind, w, h, face, off)` gives how far inside its bounding face a node of that kind and size has its outline, at `off` from the face's middle along it: where an arrow on that face meets the shape. 0 for a box; a diamond's corners sit at the face middles; a pill rounds in at its ends, a cylinder at its top and bottom. `flow` moves each arrow's ends by it.

## `edgePath`

`edgePath(a, b, ports?)` gives the SVG path data (`"M x y L x y …"`) of the route from box `a` to box `b`, each a `{ x, y, w, h }`. Same row: one horizontal line between the facing edges. Same column: one vertical line. Otherwise: out of the side of `a` that faces `b`, vertical at the midpoint of the gap, into `b`. `ports` (`{ out?, in?, mid? }`, default 0) shifts the exit and entry along their faces and the middle run sideways; when exit and entry line up the route stays straight. Boxes of size 0 give centre-to-centre paths.
