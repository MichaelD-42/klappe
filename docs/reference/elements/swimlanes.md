# Swimlanes: `swimlanes`

Horizontal lanes with their label on the left, tasks as boxes in their lane and arrows between them, including across lanes. A token walks the process one task per step: the active lane brightens and the others dim.

Catalog: section `290-swimlanes` (`#/swimlanes/process/1`; built task by task, `#/swimlanes/build/1`).

## `swimlanes`

Only in `scene.ts`. From `decks/demo/sections/290-swimlanes/10-process/scene.ts`:

```ts
import { swimlanes, type SwimlanesHandle } from "klappe/fx";

build: (ctx) => ({
  s: swimlanes(ctx, {
    x: 160, y: 140, w: 1600, h: 760,
    lanes: [{ id: "cust", label: "Customer" }, { id: "sales", label: "Sales" }],
    tasks: [
      { id: "order", lane: "cust", col: 0, label: "Place order" },
      { id: "check", lane: "sales", col: 1, label: "Check order" },
    ],
    links: [{ from: "order", to: "check" }],
  }),
}),
steps: [(tl, r: { s: SwimlanesHandle }) => r.s.show(tl), (tl, r) => r.s.walk("order")(tl), (tl, r) => r.s.walk("check")(tl)],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `x`, `y`, `w`, `h` | numbers | required | the area; lanes split `h` equally and the left 15% of `w` is the label column |
| `lanes` | `{ id, label }[]` | required | the bands, top to bottom; labels are at least 20 px |
| `tasks` | `{ id, lane, col, label }[]` | required | boxes in the lane `lane` at column `col` (from 0, right of the label column); an unknown lane throws `swimlanes: unknown lane "<id>"` |
| `links` | `{ from, to }[]` | required | arrows between task ids; an unknown id throws `swimlanes: unknown task "<id>"` |

### Step adders

| Handle | Step |
| --- | --- |
| `show` | a step adder itself (`r.s.show(tl)`): what is not shown yet fades in, the lanes and labels first, then the tasks, then every link draws on with `drawOn`, its arrowhead appearing as the line arrives |
| `tasks(ids)` | returns a step adder: the tasks in `ids` fade in (the lanes and labels with the first call), then every link whose two ends now show draws on. Tasks shown before stay; a later `show` brings the rest. For telling a process hand-off by hand-off. An unknown id throws `swimlanes: unknown task "<id>"`. Catalog: `#/swimlanes/build/3` |
| `walk(taskId)` | a token (a 30 px `--k-accent` dot) moves from the current task to `taskId` along their link, 0.6 s; the first walk fades it in at the task. Tasks with no link in that direction: the token moves straight and the step shows `swimlanes: no link from "<a>" to "<b>"`, as `flow`'s `send` does. The active lane's fill goes to full strength and the others dim to 0.4, their labels turning `--k-muted`. The active task and the link just taken are `--k-accent`; they settle to `--k-line` as the next walk starts. An unknown id throws `swimlanes: unknown task "<id>"` |

### Limits

- Task labels wrap and shrink from 32 px to the 20 px floor (lane labels from 28 px). One that still needs more than 3 lines shows `swimlanes: label of "<id>" too long`, or `swimlanes: label of lane "<id>" too long` for a lane. The text is not cut. Fitting happens when the first step is added.
- Links get their own port on each box face and their own middle runs, so no two share a segment or an arrowhead. A link with a task in its way goes round it, between the task columns or along a lane border.
- The token rests on a task's top edge near its left corner, clear of the label, and moves in straight segments between rest points and the link's ends.

## `swimlaneRoutes`

`swimlaneRoutes({ lanes, tasks, links, x, y, w, h })` gives `{ from, to, points }[]`: the corner points of every link, with ports and lanes assigned as above. It is what `swimlanes` draws; tests use it to check that no two links overlap.
