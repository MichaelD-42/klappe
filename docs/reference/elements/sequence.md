# Sequence diagram: `sequence`

Actors in even columns, each a head with a dashed lifeline. Each message is an arrow between two lifelines at its own row; the label fades in above it once the arrow has arrived.

Gallery: section `180-sequence` (`#/sequence/order/1`, `#/sequence/twelve/1`).

## `sequence`

Only in `scene.ts`. From `decks/gallery/sections/180-sequence/10-order/scene.ts`:

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
| `messages` | `{ from, to, text, reply? }[]` | required | top to bottom, rows evenly spaced; `reply` draws the arrow dashed; `from` equal to `to` draws a loop on that lifeline; an unknown id throws `sequence: unknown actor "<id>"` |

### Step adders

Each method returns a step adder (`actors` is one itself): call it with the timeline, `r.s.message(0)(tl)`.

| Handle | Step |
| --- | --- |
| `actors` | the heads fade in, then the lifelines |
| `message(i)` | the arrow draws from the sender's lifeline to the receiver's, its head appears as the line arrives, then the label fades in above it. Several calls in one step play one after another. An index with no message throws `sequence: no message <i>` |

### Limits

- Labels are one line, 24 px shrinking to the 20 px floor. A label wider than the gap between its two lifelines (or, for a self-message, the room to the right of the loop) at the floor is reported as `sequence: label of message <i> too long`; an actor label too wide for its head as `sequence: label of actor "<id>" too long`.
- Rows need at least 36 px each; fewer room reports `sequence: <n> messages do not fit the height`. 12 messages fit in 780 px.
- Labels are fitted when the first step is added, so a sequence needs a step for the too-long checks to run.
- Labels sit on a `--k-bg` patch, so on a message that spans a lifeline between its ends the label covers that lifeline.

## `rowY`

`rowY(i, n, rect)` gives the y of message `i` of `n`: rows are evenly spaced between 28 px below the actor heads (which are 64 px tall from `rect.y`) and the bottom of `rect`, each at the middle of its band.
