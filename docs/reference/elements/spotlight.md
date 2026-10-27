# Spotlight: `spotlight`

Dims the scene but for a hole around one target, so the room looks there. The next step can move the hole to another target or lift the dim. The hole has an `--k-accent` edge; the dim is `--k-blackout`.

Catalog: section `265-spotlight` (`#/spotlight/on-a-flow/2`).

## `spotlight`

Only in `scene.ts`. From `decks/demo/sections/265-spotlight/10-on-a-flow/scene.ts`:

```ts
import { flow, spotlight, type FlowHandle, type SpotlightHandle } from "klappe/fx";

build: (ctx) => ({ f: flow(ctx, { /* … */ }), s: spotlight(ctx) }),
steps: [
  (tl, r) => r.f.show()(tl),
  (tl, r) => r.s.on(r.f.node("web"))(tl),
  (tl, r) => r.s.on(r.f.node("api"))(tl),
  (tl, r) => r.s.off(tl),
],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `dim` | number | 0.7 | 0 to 1: how dark the scene goes around the hole |
| `pad` | number | 24 | scene units between the target and the hole's edge |
| `shape` | `"rect"` or `"circle"` | `"rect"` | `"circle"`: a round hole through the target's corners plus `pad`, for an icon or a dot. Catalog: `#/spotlight/round/2` |

### Step adders

| Handle | Step |
| --- | --- |
| `on(target)` | `target` is an element (its box is measured) or a rect `{ x, y, w, h }` in scene units. The first `on` fades the dim in with the hole in place; a later one moves the hole there |
| `off` | the dim fades out; a later `on` fades it in again |

### Limits

- An element target is measured when its step is added, like a `callout` target: it must be in its final place by then. One with no size reports `spotlight: target has no size to measure` and the step shows no spotlight.
- The dim covers the scene's own content only, not the gallery caption (z-index 6) or other scenes.
- The hole is a rounded rectangle; for a circle, use a hand-drawn annotation.
