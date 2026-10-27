# Mesh: `mesh3d`

A mesh of dots that turns in 3D by itself: a quiet character for a scene. Its colour and speed show a mood.

Catalog: section `340-mesh3d` (`#/mesh3d/avatar/1`). Story: `#/training/your-turn/1`.

## `mesh3d`

In `scene.ts`: `mesh3d(ctx, { x, y, size, mood, speed, density, seed, start, dot, minAlpha, brightness })` returns `{ show, hide, mood, collapse, destroy }`. From `decks/demo/sections/340-mesh3d/10-avatar/scene.ts`:

```ts
build: (ctx) => ({ m: mesh3d(ctx, { x: 960, y: 400, size: 640, seed: 1 }) }),
steps: [(tl, { m }) => m.show(tl, undefined, { from: { x: 200, y: 160 } }), (tl, { m }) => m.mood(tl, "curious"), null, (tl, { m }) => m.collapse(tl)],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `x`, `y` | number | required | the centre, scene units |
| `size` | number | required | the side of the square the mesh fills, scene units |
| `mood` | `"calm" \| "curious" \| "careful" \| "insight" \| "celebrating"` | `calm` | the first mood (see Moods) |
| `speed` | number | the mood's | seconds per turn, for every mood |
| `density` | number | 60 | the number of dots |
| `seed` | number | 1 | the same seed gives the same mesh |
| `start` | `"mesh" \| "dot"` | `mesh` | `dot`: one pulsing dot shows from load, with no step, and `show` grows the mesh out of it |
| `dot` | number | 1 | a dot size factor. Larger dots read better on a white frame |
| `minAlpha` | number | 0.35 | the opacity of the farthest dot, 0 to 1. Near dots stay at full opacity |
| `brightness` | number | 1 | lightens or darkens every mood colour: above 1 mixes it toward white (2 is white), below toward black. Use it on a dark frame instead of a CSS filter; the hue stays |

### Step adders

| Handle | Step |
| --- | --- |
| `show(tl, at?, { from? })` | the mesh forms. With `from`, a scene-local point, the dots spread out from that point |
| `hide(tl, at?)` | the mesh fades out |
| `mood(tl, name, at?)` | the colour and the turn speed change to the mood |
| `collapse(tl, at?)` | the mesh pulls in to one pulsing dot |
| `destroy()` | not a step: stops the frame loop and removes the canvas |

### Moods

The mood colours are fixed. A theme does not change them, because a mood is part of the story, not of the look.

| Mood | Colour | Seconds per turn |
| --- | --- | --- |
| `calm` | #009A9B | 24 |
| `curious` | #2E86C1 | 16 |
| `careful` | #E8590C | 32 |
| `insight` | #AB9759 | 20 |
| `celebrating` | #69DB7C | 8 |

### Limits

- The turn runs on its own frame loop (`gsap.ticker`), outside the steps. The root has `data-k-ignore`, so the self-test leaves it out. The form, the colour, the speed and the collapse are on the timeline, so a seek lands on the right look.
- The loop draws only between `show` and `hide`, only while its scene is the current scene, and only while its canvas is the active one (`data-k-active`). On another scene of the same canvas the mesh stops. It goes on when the deck comes back to its scene. It reads no style per frame.
- Reduced motion draws still frames.
- An unknown mood name throws.
