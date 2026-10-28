# Process steps: `processSteps`

The "step 2 of 5" bar of a process training: numbered chevrons across a rect, interlocking, with the current stage lit in the accent. Stages before it turn `--k-muted`, the ones after it stay `--k-fg`. Each step can move the light on.

Catalog: section `296-cycles` (`#/cycles/stage-bar/1`).

## `processSteps`

Only in `scene.ts`. From `decks/demo/sections/296-cycles/30-stage-bar/scene.ts`:

```ts
import { processSteps, type ProcessStepsHandle } from "klappe/fx";

build: (ctx) => ({ p: processSteps(ctx, { steps: ["Plan", "Build", "Test", "Release", "Learn"], x: 160, y: 480, w: 1600, h: 140 }) }),
steps: [
  (tl, r: { p: ProcessStepsHandle }) => r.p.show(tl),
  (tl, r) => r.p.to(1)(tl),
  (tl, r) => r.p.to(2)(tl),
],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `steps` | `string[]` | required | the stage names, in order; each shows after its number |
| `x`, `y`, `w`, `h` | number | required | the bar's rect, scene units. The chevrons share the width; each point reaches into the next one's notch |
| `current` | number | `0` | the stage lit when the bar shows, 0-based |

### Step adders

| Handle | Step |
| --- | --- |
| `show` | the chevrons fade in, `current` lit (`--k-accent` outline over an accent tint) |
| `to(i)` | the light moves to stage `i` (0-based) from where the steps before left it; the labels before `i` turn muted, the rest plain. Lighting the lit stage again holds |

### Limits

- Every label shares one font size, from 30 down to the 20 px floor. A name that still does not fit its chevron reports `processSteps: "<name>" does not fit its chevron at 20px; shorten it or widen the rect`.
- `to(i)` or `current` outside the stages reports `processSteps: no stage <i>; the stages are 0 to <last>`.
- For a loop that comes back round use [`cycle`](cycle.md); for a vertical time plan use [`agenda`](agenda.md).
