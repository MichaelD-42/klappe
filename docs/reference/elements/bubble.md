# Speech bubble: `bubble`

A speech bubble with a tail that points at a spot in the scene.

Gallery: section `230-mesh3d` (`#/mesh3d/avatar/3`), and `60-motion` (`#/motion/talk/1`).

## `bubble`

In `scene.ts`: `bubble(ctx, { x, y, text, side, maxWidth })` returns `{ show, hide }`. From `decks/gallery/sections/230-mesh3d/10-avatar/scene.ts`:

```ts
beside: bubble(ctx, { x: 1290, y: 400, side: "right", maxWidth: 440, text: "Beside the mesh, wrapped at 440 px." }),
below: bubble(ctx, { x: 960, y: 730, side: "top", text: "Below the mesh." }),
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `x`, `y` | number | required | the point the tail touches, scene units |
| `text` | string | required | the text |
| `side` | `"right" \| "left" \| "top" \| "bottom"` | `right` | `right` and `left`: the bubble sits on that side of the point. `top` and `bottom`: the tail is on that edge, so `top` puts the bubble below the point |
| `maxWidth` | number | 640 | the widest the bubble gets, px. Longer text wraps |

The border is `--k-accent`, the fill `--k-bg` and the text `--k-fg`.

### Step adders

| Handle | Step |
| --- | --- |
| `show(tl, at?)` | the bubble pops in. Use `at: "<"` to show it together with another one |
| `hide(tl, at?)` | the bubble fades out. Use `at: "<"` to hide it together with another one |

### `bubbleLayout`

`bubbleLayout(side)` returns where the bubble sits from its point and which edge has the tail. The unit test uses it.
