# Callouts: `callout`

Points at a part of a scene: a leader line draws from the target to a label box, then the label's text fades in. Works on code lines, any HTML or SVG element, or a plain point.

Gallery: section `160-callout` (`#/callout/code/1` and `#/callout/point/1`).

## `callout`

Only in `scene.ts`. From `decks/gallery/sections/160-callout/10-code/scene.ts`:

```ts
import { callout, code, type CalloutHandle, type CodeHandle } from "klappe/fx";
import { captioned } from "../../../caption";

const SRC = "const data = load();\nconst bad = check(data);\nsave(bad);";

export default captioned("callout() — a leader line draws on, then the label and its text fade in", {
  build: (ctx) => {
    const c = code(ctx, { src: SRC, lang: "js", x: 160, y: 160, w: 1000, h: 400 });
    return { c, note: callout(ctx, { target: c.line(2), text: "This line is the bug", side: "right" }) };
  },
  steps: [(tl, r: { c: CodeHandle }) => r.c.show(tl), (tl, r: { note: CalloutHandle }) => r.note.show(tl)],
});
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `target` | `Element` or `{ x, y }` | required | an element (its box is measured), or a point in scene units |
| `text` | string | required | the label text |
| `side` | `"left"`, `"right"`, `"top"`, `"bottom"` | required | the side of the target the leader leaves from, and where the label sits |
| `offset` | number | 120 | the leader's length in scene units |

### Step adders

| Handle | Step |
| --- | --- |
| `show` | the leader draws on from the target edge (`--k-line`), the label box (`--k-surface`) fades in, then its text |

### Limits

- Coordinates are scene-local, like `ctx.svg` and `ctx.html`. The target is measured when `show` is added, as a ratio of its rect to the scene's, so the camera does not matter. The target must have a size and be laid out then; if not, the deck shows `callout: target of "<text>" has no size to measure` and nothing draws.
- The label is 32 px text, up to 520 units wide. If it would leave the frame, the deck shows `callout: "<text>" does not fit the frame on side <side>`; the label is not moved. Pick another `side` or a smaller `offset`.
- A target that moves after `show` (a code `diff`) leaves the leader where it was.

## `anchor`

`anchor(box, side, offset = 120)` gives `{ from, to }`: the midpoint of the box's edge on `side`, and the point `offset` further out, where the label's near edge midpoint sits. A point is a box of width and height 0.

## `labelPos`

`labelPos(to, side, w, h)` gives the label's top-left corner for a leader end `to`: the label is centred on the leader across `side`, and lies beyond it along `side`.
