# Focus: `focus`

Lights one item of a list while the others dim in place, so the audience looks at it. The next step can move the focus to another item or clear it. Unlike `spotlight`, nothing covers the scene: only the items' opacity changes.

Catalog: section `266-focus` (`#/focus/talk-through/2`).

## `focus`

Only in `scene.ts`. From `decks/demo/sections/266-focus/10-talk-through/scene.ts`:

```ts
import { flow, focus, type FlowHandle, type FocusHandle } from "klappe/fx";

build: (ctx) => {
  const f = flow(ctx, { /* … */ });
  return { f, x: focus(ctx, ["web", "api", "db"].map((id) => f.node(id))) };
},
steps: [
  (tl, r) => r.f.show()(tl),
  (tl, r) => r.x.on(0)(tl),
  (tl, r) => r.x.on(1)(tl),
  (tl, r) => r.x.on(r.f.node("db"))(tl),
  (tl, r) => r.x.clear(tl),
],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `dim` | number | 0.35 | 0 to 1: the opacity of the items not in focus |

### Step adders

| Handle | Step |
| --- | --- |
| `on(item)` | `item` is an index into the list or one of its elements. That item goes to full opacity, the others fade to `dim`, 0.6 s, `power2.inOut`. A later `on` moves the focus |
| `clear` | all items fade back to full opacity, 0.6 s, `power2.inOut` |

With reduced motion the fade stays: nothing moves.

### Limits

- Items must be visible before the first `on` (from build or an earlier step). `focus` sets nothing at build and takes their start opacity as 1: the first `on` fades the others from 1 to `dim` and leaves the lit item as it is. Nothing else may tween their opacity after the first `on`.
- An index out of range, or an element not in the list, reports `focus: the item is not in the list`, and the step changes nothing.
- No accent cue of its own. For one, add a `glow` on the same step. [attention](attention.md)
