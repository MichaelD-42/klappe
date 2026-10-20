# Swimlanes: `swimlanes`

Horizontal lanes with their label on the left, tasks as boxes in their lane and arrows between them, including across lanes. A token walks the process one task per step: the active lane brightens and the others dim.

Gallery: section `190-swimlanes` (`#/swimlanes/process/1`, `#/swimlanes/direct/2`).

## `swimlanes`

Only in `scene.ts`. From `decks/gallery/sections/190-swimlanes/10-process/scene.ts`:

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
| `show` | a step adder itself (`r.s.show(tl)`): the lanes and labels fade in, then the tasks, then every link draws on with `drawOn`, its arrowhead appearing as the line arrives |
| `walk(taskId)` | a token (a 30 px `--k-accent` dot) moves from the current task to `taskId` along their link, 0.6 s; the first walk fades it in at the task. Tasks with no link in that direction: the token moves straight and nothing is reported. The active lane's fill goes to full strength and the others dim to 0.4, their labels turning `--k-muted`. The active task and the link just taken are `--k-accent`; they settle to `--k-line` as the next walk starts. An unknown id throws `swimlanes: unknown task "<id>"` |

### Limits

- Task labels wrap and shrink from 32 px to the 20 px floor (lane labels from 28 px). One that still needs more than 3 lines shows `swimlanes: label of "<id>" too long`, or `swimlanes: label of lane "<id>" too long` for a lane. The text is not cut. Fitting happens when the first step is added.
- Links get their own port on each box face and their own middle run, so no two share a segment or an arrowhead. They are not routed around other boxes.
- The token rests on a task's top edge near its left corner, clear of the label, and moves in straight segments between rest points and the link's ends.

## `swimlaneRoutes`

`swimlaneRoutes({ lanes, tasks, links, x, y, w, h })` gives `{ from, to, points }[]`: the corner points of every link, with ports and lanes assigned as above. It is what `swimlanes` draws; tests use it to check that no two links overlap.
