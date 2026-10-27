# Flip card: `flipCard`

A card that turns over to show its back: a question, then the answer; a myth, then the fact. It turns on its vertical axis in 3D. The front has a `--k-line` border, the back a `--k-accent` border, since the back is the new thing.

Catalog: section `275-flipcard` (`#/flipcard/cards/2`).

## `flipCard`

Only in `scene.ts`. From `decks/demo/sections/275-flipcard/10-cards/scene.ts`:

```ts
import { flipCard, type FlipCardHandle } from "klappe/fx";

build: (ctx) => ({
  q: flipCard(ctx, { x: 160, y: 280, w: 720, h: 420, front: "How long does a release take?", back: "Forty minutes, door to door." }),
  m: flipCard(ctx, { x: 1040, y: 280, w: 720, h: 420, front: "More testers make it faster.", back: "Smaller batches do." }),
}),
steps: [
  (tl, r) => { r.q.show(tl); r.m.show(tl); },
  (tl, r) => r.q.flip(tl),
  (tl, r) => r.m.flip(tl),
  (tl, r) => r.q.flip(tl),
],
```

Call `flipCard` in `build`, so the card exists at load; the steps only use what it returns.

### Options

| Name     | Type   | Default      | Meaning                                 |
| -------- | ------ | ------------ | --------------------------------------- |
| `x`, `y` | number | (required)   | the card's top-left corner, scene-local |
| `w`, `h` | number | `640`, `400` | the card's size                         |
| `front`  | string | (required)   | the text on the front                   |
| `back`   | string | (required)   | the text on the back                    |

### Step adders

| Handle | Step |
| --- | --- |
| `show` | the card fades in, front up, 0.6 s |
| `flip` | the card turns over to its other side, 0.9 s, `power2.inOut`. Each `flip` turns it again: front, back, front. With reduced motion the sides crossfade, 0.6 s |

### Limits

- With reduced motion the two sides crossfade in place; the card does not turn. The PDF export uses reduced motion, so each page shows the side its step leaves.
- Each side's text shrinks from 40 px to the 20 px floor to fit the face; text that still does not fit shows `flipCard: text of the front too long` (or `back`). Fitting happens when the first step is added. At 40 px a default card holds about six short lines.
