# Dependency graph: `depGraph`

What depends on what, laid out from the links alone: each box sits one column right of the furthest box that depends on it, so every arrow points right, and a link that skips columns runs through a slot of its own between the boxes. `trace(id)` lights what a box needs, hop by hop; `trace(id, { up: true })` lights everything that depends on it, its blast radius. For architecture and incident talks. When you want to place every box yourself, use [`flow`](flow.md).

Catalog: section `270-flow` (`#/flow/dependencies/2`, the blast radius at `#/flow/dependencies/3`).

## `depGraph`

Only in `scene.ts`. Shortened from `decks/demo/sections/270-flow/70-dependencies/scene.ts`:

```ts
import { depGraph, type DepGraphHandle } from "klappe/fx";

build: (ctx) => ({
  g: depGraph(ctx, {
    x: 160, y: 100, w: 1600, h: 760,
    nodes: [{ id: "web", label: "Web shop" }, { id: "orders", label: "Orders" }, { id: "queue", label: "Queue" } /* … */],
    links: [{ from: "web", to: "orders" }, { from: "orders", to: "queue" } /* … */],
  }),
}),
steps: [
  (tl, r: { g: DepGraphHandle }) => r.g.show(tl),
  (tl, r) => r.g.trace("orders")(tl),
  (tl, r) => r.g.trace("queue", { up: true })(tl),
  (tl, r) => r.g.clear(tl),
],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `nodes` | `{ id, label }[]` | required | the boxes. The first column keeps this order; later columns follow the order of what depends on them, which keeps arrows from crossing where it can |
| `links` | `{ from, to }[]` | required | `from` depends on `to`: an arrow from `from` to `to` |
| `x`, `y`, `w`, `h` | number | required | the area, scene units. Columns share the width, a box 62 % of its column (at most 320); the fullest column's slots share the height, a box 60 % of its slot (at most 96) |

The layout is the same for the same input: no randomness.

### Step adders

`show` and `clear` are step adders themselves: `r.g.show(tl)`. `trace` returns one.

| Handle | Step |
| --- | --- |
| `show` | the boxes fade in column by column, then the arrows draw on |
| `trace(id, { up? })` | `id` and every box it reaches get an `--k-accent` ring, one hop after another (0.35 s apart), and the arrows the trace runs along turn accent; the rest dims to 0.3. Down (default) follows what `id` depends on; `up` follows what depends on it. A later `trace` changes only what differs |
| `clear` | everything back to plain |
| `node(id)` | the box element, for `callout` or `glow`. Not a step |

### Limits

- A cycle reports `depGraph: a cycle through "<a>", "<b>"; a dependency graph has none`; its boxes go in the first column. A link to an unknown id reports `depGraph: no node "<id>"` and is left out; a trace of one reports `depGraph: trace of unknown node "<id>"` and holds a beat.
- Columns narrower than a 140 px box report `depGraph: <n> columns do not fit <w>px`; slots too low for a 48 px box `depGraph: <n> nodes in one column do not fit <h>px`. A link that skips columns takes a slot in each, so it counts.
- Labels wrap to two lines and shrink from 26 px to the 20 px floor; one still too long reports `depGraph: label of "<id>" too long`. Fitting happens when the first step is added.
- Arrows are curves between columns; two arrows may cross.

## `depLayout`, `depReach`

`depLayout(opts)` gives `{ nodes, links, via, problems }`: each node with its `col` and box, the links kept, and `via[i]`, the slot centres link `i` runs through. `depReach(links, id, up?)` gives the hops of a trace, `[[id], [first hop], …]`, each node in the first hop that reaches it. Their unit test uses them.
