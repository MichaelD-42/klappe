# Focus: `focus`

Lights one item of a list while the others dim in place, so the room looks there. The next step can move the focus to another item or clear it. Unlike `spotlight`, nothing covers the scene: only the items' opacity changes.

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
| `on(item)` | `item` is an index into the list or one of its elements. That item goes to full opacity, the others fade to `dim`. A later `on` moves the focus |
| `clear` | all items fade back to full opacity |

With reduced motion the fade stays: nothing moves.

### Limits

- `focus` sets nothing at build. The items must be shown by an earlier step, and nothing else may tween their opacity after the first `on`.
- An item not in the list reports `focus: the item is not in the list`, and the step changes nothing.
- No accent cue of its own. For one, add a `glow` on the same step. [attention](attention.md)
