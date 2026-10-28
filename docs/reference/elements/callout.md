# Callouts: `callout`

Points at a part of a scene: a leader line draws from the target to a label box, then the label's text fades in. Works on code lines, any HTML or SVG element, or a plain point.

Catalog: section `260-callout` (`#/callout/code/2` and `#/callout/point/1`).

## `callout`

Only in `scene.ts`. From `decks/demo/sections/260-callout/10-code/scene.ts`:

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
| `show` | the leader draws on from the target edge (`--k-accent`, over the scene's HTML, so a picture under the target does not hide it), the label box (`--k-surface`, 2px `--k-accent` border) fades in, then its text |
| `hide` | the leader and the label fade out. Add it in a step after `show`; on a callout that did not draw (see Limits) it does nothing. Catalog: `#/callout/point/2` |
| `follow` | the leader and the label move to where the target is once this step has played, from the step's start, as the target moves. Add it in the step that moves the target, after the move: `(tl, r) => (r.c.diff(src)(tl), r.note.follow(tl))`. Before `show` it reports `callout: follow of "<text>" before it shows`; a place out of the frame reports the frame problem and leaves the callout where it was. Catalog: `#/callout/code/3` |

### Hotspots

Numbered marks on a picture, each explained on its step while the others dim, need no effect of their own: draw the marks as small `--k-accent` circles in `ctx.html`, pass them to [`focus`](focus.md), and give each a callout. Each step hides the previous callout, moves the focus and shows the next. Catalog: `#/callout/hotspots/2`, from `decks/demo/sections/260-callout/30-hotspots/scene.ts`.

### Limits

- Coordinates are scene-local, like `ctx.svg` and `ctx.html`. The target is measured when `show` is added, where the steps before leave it (a line an earlier `diff` moved), as a ratio of its rect to the scene's, so the camera does not matter. The target must have a size and be laid out then; if not, the deck shows `callout: target of "<text>" has no size to measure` and nothing draws.
- The label is 32 px text, up to 520 units wide. If it would leave the frame, the deck shows `callout: "<text>" does not fit the frame on side <side>`; nothing is drawn and the label is not moved. Pick another `side` or a smaller `offset`.
- A target that moves after `show` leaves the callout behind unless a `follow` step moves it along.

## `anchor`

`anchor(box, side, offset = 120)` gives `{ from, to }`: the midpoint of the box's edge on `side`, and the point `offset` further out, where the label's near edge midpoint sits. A point is a box of width and height 0.

## `labelPos`

`labelPos(to, side, w, h)` gives the label's top-left corner for a leader end `to`: the label is centred on the leader across `side`, and lies beyond it along `side`.
