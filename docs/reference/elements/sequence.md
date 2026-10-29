# Sequence diagram: `sequence`

Actors in even columns, each a head with a dashed lifeline. Each message is an arrow between two lifelines at its own row; the label fades in above it once the arrow has arrived.

Catalog: section `280-sequence` (`#/sequence/order/1`, `#/sequence/twelve/1`).

## `sequence`

Only in `scene.ts`. From `decks/demo/sections/280-sequence/10-order/scene.ts`:

```ts
import { sequence, type SequenceHandle } from "klappe/fx";

build: (ctx) => ({
  s: sequence(ctx, {
    x: 160, y: 130, w: 1600, h: 780,
    actors: [{ id: "c", label: "Client" }, { id: "a", label: "API" }],
    messages: [
      { from: "c", to: "a", text: "POST /orders" },
      { from: "a", to: "a", text: "Validate" },
      { from: "a", to: "c", text: "201 Created", reply: true },
    ],
  }),
}),
steps: [(tl, r: { s: SequenceHandle }) => r.s.actors(tl), (tl, r) => r.s.message(0)(tl)],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `x`, `y`, `w`, `h` | numbers | required | the area; heads sit at the top, lifelines run to the bottom |
| `actors` | `{ id, label }[]` | required | left to right in even columns; head border in `--k-series-1` to `--k-series-6` in turn, label in `--k-fg` on `--k-surface` |
| `messages` | `({ from, to, text, reply? } \| { note, over })[]` | required | the rows, top to bottom, evenly spaced; `reply` draws the arrow dashed; `from` equal to `to` draws a loop on that lifeline. A `{ note, over }` row is a note box over actor `over` (220 px wide), or across two, `over: ["a", "b"]`, from 110 px left of the first lifeline to 110 px right of the second. An unknown id throws `sequence: unknown actor "<id>"` |
| `activations` | `{ actor, from, to }[]` | none | a 16 px bar on the actor's lifeline from row `from` to row `to`, in `--k-surface` with a `--k-line` edge, under the arrows: the actor is busy. It shows with row `from`. Catalog: `#/sequence/frames/2` |
| `frames` | `{ kind, label, from, to, else? }[]` | none | a frame across the diagram round rows `from` to `to`, `kind` (`"alt"`, `"loop"`, `"opt"` or `"par"`) and `[label]` in its corner; `else: { at, label }` draws a dashed line across it above row `at` with `[label]`. A frame inside another sits 12 px further in. Each shows with its first row; the else line with its row. Catalog: `#/sequence/frames/4` |

### Step adders

Each method returns a step adder (`actors` is one itself): call it with the timeline, `r.s.message(0)(tl)`.

| Handle | Step |
| --- | --- |
| `actors` | the heads fade in, then the lifelines |
| `message(i)` | shows row `i` and the bars and frames that start there. A note row fades in. A message: the arrow draws from the sender's lifeline to the receiver's, its head appears as the line arrives, then the label fades in above it. Several calls in one step play one after another. An index with no message throws `sequence: no message <i>` |
| `highlight(i)` | message `i`, shown by an earlier step, takes the accent again (its arrow, head and label), as the newest message has it; the one lit before settles. `highlight(null)` lights none. For "back to this call" while you talk. A note row, or a message no step before has shown, reports `sequence: highlight(<i>) needs a message a step before has shown` and holds a beat. Catalog: `#/sequence/order/5` |

### Limits

- Labels are one line, 24 px shrinking to the 20 px floor. A label wider than the gap between its two lifelines (or, for a self-message, the room to the right of the loop) at the floor is reported as `sequence: label of message <i> too long`; an actor label too wide for its head as `sequence: label of actor "<id>" too long`.
- Rows need at least 36 px each; fewer room reports `sequence: <n> messages do not fit the height`. 12 messages fit in 780 px.
- Labels are fitted when the first step is added, so a sequence needs a step for the too-long checks to run.
- A row index in `activations` or `frames` that is not a row throws `sequence: <an activation | a frame | an else> names row <i>, which is not there`.
- A note is one line and shrinks like a label; too long for its box reports `sequence: label of message <i> too long`.
- Frames and else lines are 20 px text. A frame's corner tag can sit under a message label that starts at the frame's left edge; leave the first lifeline's column free there.
- Labels sit on a `--k-bg` patch, so on a message that spans a lifeline between its ends the label covers that lifeline.

## `rowY`

`rowY(i, n, rect)` gives the y of message `i` of `n`: rows are evenly spaced between 28 px below the actor heads (which are 64 px tall from `rect.y`) and the bottom of `rect`, each at the middle of its band.
