# Cycle and V model: `cycle`, `vModel`

Two process diagrams for training. `cycle` puts phases round a ring (PDCA, a feedback loop) with an arrow from each to the next and lights the current phase. `vModel` draws the V model: the left leg steps down from requirements to design, the right leg climbs from unit test to acceptance, and a dashed link joins each level to the test that checks it. A step lights a level or a link.

Catalog: section `296-cycles` (`#/cycles/pdca/1`, `#/cycles/v-model/1`).

## `cycle`

Only in `scene.ts`. From `decks/demo/sections/296-cycles/10-pdca/scene.ts`:

```ts
import { cycle, type CycleHandle } from "klappe/fx";

build: (ctx) => ({ c: cycle(ctx, { x: 960, y: 490, r: 330, phases: ["Plan", "Do", "Check", "Act"] }) }),
steps: [
  (tl, r: { c: CycleHandle }) => r.c.show(tl),
  (tl, r) => r.c.phase(0)(tl),
  (tl, r) => r.c.phase(1)(tl),
],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `x`, `y` | numbers | required | the centre of the ring, scene-local |
| `r` | number | required | the radius the phase boxes sit on; each box is 240×80, centred on the ring |
| `phases` | `string[]` | required | the phase labels, clockwise from the top |

### Step adders

| Handle | Step |
| --- | --- |
| `show` | a step adder itself (`r.c.show(tl)`): round the ring, each box fades in and the arc to the next box draws on with `drawOn`, its head last |
| `phase(i)` | lights phase `i` (from 0): its box gets a 4 px `--k-accent` border (its 2 px border and a 2 px outline, so nothing moves). The phase lit before settles back to its 2 px `--k-line` border as this step starts. Lighting the phase that is already lit keeps it lit. A box not shown yet appears. An index with no phase throws `cycle: no phase <i>` |

## `vModel`

Only in `scene.ts`. From `decks/demo/sections/296-cycles/20-v-model/scene.ts`:

```ts
import { vModel, type VModelHandle } from "klappe/fx";

build: (ctx) => ({
  v: vModel(ctx, {
    x: 160, y: 110, w: 1600, h: 800,
    levels: [
      { left: "Requirements", right: "Acceptance test" },
      { left: "System design", right: "System test" },
      { left: "Architecture", right: "Integration test" },
      { left: "Module design", right: "Unit test" },
    ],
  }),
}),
steps: [
  (tl, r: { v: VModelHandle }) => r.v.show(tl),
  (tl, r) => r.v.level(0)(tl),
  (tl, r) => r.v.link(0)(tl),
],
```

### vModel options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `x`, `y`, `w`, `h` | numbers | required | the area; the bottom 90 px hold the arrow that turns the V |
| `levels` | `{ left, right }[]` | required | from the top: `left` is the design step, `right` the test that checks it. Boxes are up to 320×80; the left box of each level steps in toward the middle and the right box mirrors it, so the bottom link is 80 px long |

### vModel step adders

| Handle | Step |
| --- | --- |
| `show` | a step adder itself: down the left leg, round the turn and up the right leg, each box fades in and the arrow to the next draws on; then the dashed links draw on |
| `level(i)` | lights both boxes of level `i` (from 0), as `cycle` lights a phase |
| `link(i)` | draws a solid 6 px `--k-accent` line over the dashed link of level `i` |

One thing is lit at a time: whatever the latest `level` or `link` lit settles as the next `level` or `link` step starts. An index with no level throws `vModel: no level <i>`.

## Limits

- Labels wrap to two lines and shrink from 26 px to the 20 px floor. One that still does not fit shows `cycle: label "<label>" too long` or `vModel: label "<label>" too long`. The text is not cut. Fitting happens when the first step is added.
- A ring too small for its phases (no room for an arc between two neighbouring boxes) shows `cycle: <n> phases do not fit a ring of radius <r>` and draws no arcs.
- A V too low for its levels (boxes under 56 px) shows `vModel: <n> levels do not fit <h>px`.
- Reduced motion changes nothing: the steps only fade, draw on and change colour; nothing moves.

## `cycleLayout`, `vModelLayout`

`cycleLayout({ x, y, r }, n)` gives `{ nodes, arcs, problem? }`: the box centres and, per phase, the SVG path of the arc to the next phase and of its head. `vModelLayout({ x, y, w, h }, n)` gives `{ left, right, links, problem? }`: the box rects per level and each link's `{ x1, x2, y }`. They are what `cycle` and `vModel` draw; the unit test uses them.
