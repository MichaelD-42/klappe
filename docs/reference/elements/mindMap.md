# Mind map: `mindMap`

A centre topic and its branches round it, each with its sub-branches further out, growing one branch per step. Each branch has its own `--k-series-N` colour (repeating past six). For a tree read top-down with a route through it, use [`decisionTree`](decisionTree.md).

Catalog: section `300-tree` (`#/tree/mind-map/1`).

## `mindMap`

Only in `scene.ts`. Shortened from `decks/demo/sections/300-tree/30-mind-map/scene.ts`:

```ts
import { mindMap, type MindMapHandle } from "klappe/fx";

build: (ctx) =>
  mindMap(ctx, {
    x: 160, y: 60, w: 1600, h: 860,
    root: { label: "Onboarding", children: [{ label: "People", children: [{ label: "Buddy" }] }, { label: "Tools" }] },
  }),
steps: [(tl, m: MindMapHandle) => m.show(tl), (tl, m) => m.next()(tl), (tl, m) => m.next()(tl)],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `root` | `{ label, children? }` | required | the centre topic; its `children` are the branches, theirs the sub-branches. Deeper levels are not drawn |
| `x`, `y`, `w`, `h` | number | required | the map's rect, scene units. The centre sits in its middle |

The layout gives every sub-branch (and every branch without one) an even share of the turn, from 12 o'clock clockwise, so neighbouring branches never cross. The sub-branches sit on an ellipse inset from the rect by the longest sub-branch label, each label beside its point towards the outside.

### Step adders

| Handle | Step |
| --- | --- |
| `show` | the centre topic fades in |
| `next()` | the next branch grows: its line draws out from the centre, its label shows, then its sub-branches draw out one after another. Branches grow in order, in step order, whichever adder was made first |

### Limits

- Text is 26 scene units (18.5 px at 1366); the centre topic 34.
- Two sub-branch labels that would touch report `mindMap: "<a>" and "<b>" overlap; use fewer sub-branches or a larger rect`.
- A `next()` past the last branch reports `mindMap: next() past the last branch (<n> branches)` and holds a beat.
