# Decision tree: `decisionTree`

A top-down tree of boxes joined by labelled lines (yes/no and the like). `path` lights the route a decision took and dims the rest.

Gallery: section `200-tree` (`#/tree/route/1`, `#/tree/route/3`, `#/tree/levels/2`).

## `decisionTree`

Only in `scene.ts`. From `decks/gallery/sections/200-tree/10-route/scene.ts`:

```ts
import { decisionTree, type TreeHandle } from "klappe/fx";

build: (ctx) => ({
  t: decisionTree(ctx, {
    x: 160, y: 140, w: 1600, h: 760,
    root: {
      label: "Is it a bug?",
      children: [
        { edge: "yes", node: { label: "Fix it" } },
        { edge: "no", node: { label: "Plan it" } },
      ],
    },
  }),
}),
steps: [(tl, r: { t: TreeHandle }) => r.t.show(tl), (tl, r) => r.t.path(["yes"])(tl)],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `root` | `TreeNode` | required | `{ label, children?: { edge, node }[] }`; `edge` is the label on the line into `node` |
| `x`, `y`, `w`, `h` | numbers | required | the area, scene-local; laid out with `d3.tree` |
| `build` | `"all" \| "levels"` | `"all"` | `"levels"` is for `level(k)` steps; `level` under `"all"` reports `tree: level() needs build: "levels"` |

Boxes are `--k-surface` with a 3px `--k-line` border, one size (up to 280 x 88). Edge labels sit at the line midpoints in a `--k-surface` patch, 20 px.

### Step adders

`show` is a step adder itself: `r.t.show(tl)`. The others return one: `r.t.path(["yes"])(tl)`.

| Handle | Step |
| --- | --- |
| `show` | the whole tree, level by level: each line draws on and its box and label arrive with it |
| `level(k)` | depth `k` (0 is the root): its lines draw on and the boxes arrive; needs `build: "levels"` |
| `path(edges)` | `edges` are labels followed from the root. The route (boxes, lines) turns `--k-accent`, its last line draws on in accent as the step plays, and everything off the route blends to `--k-muted` (still readable). Each call sets the whole picture, so it does not depend on earlier `path` calls. A label with no edge below the current box shows `tree: no edge "<label>" after "<box label>"`; the route up to there is still lit |

### Limits

- A tree too wide for `w` (boxes under 120 px, which cannot hold a label at 20 px) shows `tree: too wide for <w>px at 20px text` and draws nothing; too deep for `h` shows `tree: too deep for <h>px`.
- Labels wrap to 2 lines and shrink from 28 px to the 20 px floor; one that still does not fit shows `tree: label "<label>" too long`. This check runs when the first step is added.
- `path` shows the route if it was not shown yet; boxes off the route keep their visibility.
- Edge labels are matched by exact text; sibling edges should have different labels.

## `treeLayout`

`treeLayout(root, { x, y, w, h })` gives `{ boxes, problem? }`: each box is `{ id, label, depth, parent?, edge?, x, y, w, h }`, ids `n0`, `n1`, … in breadth-first order. It is what `decisionTree` draws; tests use it.

## `treeRoute`

`treeRoute(root, edges)` gives `{ ids, error? }`: the box ids from the root along the edge labels, stopping at the first label that is not found (with the `tree: no edge …` message in `error`).
