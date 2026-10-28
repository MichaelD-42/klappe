# Fishbone: `fishbone`

An Ishikawa diagram for root-cause training: the problem in a head on the right, a spine into it, and cause bones that slant back from the spine, alternating above and below, built one per step. Each bone names a category in a box at its outer end, with its causes branching off it. `light(i)` marks the root cause in the accent.

Catalog: section `296-cycles` (`#/cycles/fishbone/1`; `light` at `#/cycles/fishbone/6`).

## `fishbone`

Only in `scene.ts`. Shortened from `decks/demo/sections/296-cycles/40-fishbone/scene.ts`:

```ts
import { fishbone, type FishboneHandle } from "klappe/fx";

build: (ctx) =>
  fishbone(ctx, {
    x: 160, y: 60, w: 1600, h: 860,
    effect: "Releases slip",
    causes: [{ label: "People", items: ["One reviewer"] }, { label: "Process", items: ["Late testing", "Big batches"] }],
  }),
steps: [(tl, f: FishboneHandle) => f.show(tl), (tl, f) => f.next()(tl), (tl, f) => f.next()(tl), (tl, f) => f.light(1)(tl)],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `effect` | string | required | the problem, in the head; it wraps inside it |
| `causes` | `{ label, items? }[]` | required | the cause categories in build order; the first pair sits nearest the head, the first above the spine. `items` are the causes on that bone, from its outer end inwards |
| `x`, `y`, `w`, `h` | number | required | the diagram's rect, scene units. The head takes up to a quarter of the width on the right |

### Step adders

| Handle | Step |
| --- | --- |
| `show` | the head fades in and the spine draws into it |
| `next()` | the next bone draws out from the spine, its category shows, then its causes one after another. Bones build in order, in step order, whichever adder was made first |
| `light(i)` | bone `i` (0-based) and its category turn `--k-accent`, and the one lit before goes back; `light(null)` lights none. Only a built bone |

### Limits

- Text is 24 scene units (17 px at 1366), the head 28.
- A cause too long for the room between its bone and the next reports `fishbone: "<cause>" is too long for its bone; shorten it or use fewer causes`; too many causes on one bone `fishbone: <n> causes on "<label>" do not fit its bone; use a taller rect`.
- `light(i)` on a bone not built yet reports `fishbone: light(<i>) before cause <i> is built`; a `next()` past the last bone `fishbone: next() past the last cause (<n> causes)`.

## `fishboneLayout`

`fishboneLayout(opts)` gives `{ head, spine, bones, problem? }`: the head's rect, the spine's two ends, and per bone its `base` on the spine, its outer `end`, whether it is on `top`, and its causes' points. It is what `fishbone` draws; its unit test checks the alternation, the order towards the head and that causes sit on their bone.
