# Attention: `glow`, `pulse`, `shake`

Small nudges that make the room look at one element: a glow behind it (on, a slow breathe for "this one is live", off), a ring that pulses out once, and a short shake for "this failed". Each is a step adder; they work on any element, for example a flow node.

Catalog: section `268-attention` (`#/attention/nudges/2`).

Only in `scene.ts`. From `decks/demo/sections/268-attention/10-nudges/scene.ts`:

```ts
import { flow, glow, pulse, shake, type FlowHandle, type GlowHandle } from "klappe/fx";
import type { StepAdder } from "klappe/types";

build: (ctx) => {
  const f = flow(ctx, { /* … */ });
  return { f, g: glow(ctx, f.node("api")), p: pulse(ctx, f.node("web")), s: shake(f.node("db")) };
},
steps: [
  (tl, r) => r.f.show()(tl),
  (tl, r) => r.g.on(tl),
  (tl, r) => r.g.breathe(tl),
  (tl, r) => r.p(tl),
  (tl, r) => r.s(tl),
  (tl, r) => r.g.off(tl),
],
```

Call all three in `build`, so their parts exist at load; the steps only use what they return.

## `glow`

`glow(ctx, target, opts?)`. `target` is an element or a list of elements. An HTML target gets a soft box behind it; an SVG target (a part of a `lineArt` drawing) gets a blurred copy of itself behind it, so the light follows its lines. `lineArt().glow` uses it with `--k-warn`.

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `color` | string | `"--k-accent"` | the theme token the glow takes, by name |

### Step adders

| Handle | Step |
| --- | --- |
| `on` | the glow fades in and stays |
| `breathe` | the glow slowly brightens and dims, on a loop, until `on` or `off`. With reduced motion it holds steady |
| `off` | the glow fades out |

## `pulse`

`pulse(ctx, target, { color? })` returns a step adder: a ring in `--k-accent` (or `color`, a `--k-*` token name such as `"--k-warn"`) around the target grows and fades out once.

## `shake`

`shake(target)` returns a step adder: the target swings side to side twice and ends where it began.

## Limits

- An HTML target is measured when its first step is added, like a `spotlight` target: it must be in its final place by then. One with no size reports `glow: target has no size to measure` (or `pulse: …`) and shows nothing.
- The breathe loop runs on the wall clock, outside the timeline, so a step back or a seek lands on the glow but not on a point in the breath. The self-test leaves it out.
- Do not tween the target's `x` in an earlier step: the shake would snap it back to the `x` it read when its step was added.
- Pulse and shake play in full with reduced motion: they are short and run once.
- An SVG glow copy repaints its blur every frame while a breathe shows. A dashed line glows solid.
- An HTML glow sits in the HTML layer, so it covers SVG edges next to the target. It does not follow the target's own transform.
