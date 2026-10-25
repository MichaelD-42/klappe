# Card stack: `cardStack`

A fanned hand of cards. One card is pulled out, upright, raised and enlarged, while the rest stay behind, dimmed. The cards use the face style of `flipCard`: `--k-surface`, a 2 px `--k-line` border, 16 px corners.

Catalog: section `299-notes-cards` (`#/notes-cards/stack/2`).

## `cardStack`

Only in `scene.ts`. From `decks/demo/sections/299-notes-cards/20-stack/scene.ts`:

```ts
import { cardStack, type CardStackHandle } from "klappe/fx";

build: (ctx) => ({ c: cardStack(ctx, { x: 780, y: 340, cards: ["Speed", "Trust", "Focus", "Craft", "Fun"] }) }),
steps: [
  (tl, r: { c: CardStackHandle }) => r.c.show(tl),
  (tl, r) => r.c.pull(1)(tl),
  (tl, r) => r.c.pull(2)(tl),
  (tl, r) => r.c.back(tl),
],
```

Call `cardStack` in `build`; the steps only use what it returns.

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `x`, `y` | number | required | the top-left corner of the middle card before it leans, scene-local |
| `w`, `h` | number | `360`, `480` | the card size |
| `cards` | string[] | required | the text of each card, 32 px, left card first; the last card is on top |

### Step adders

| Handle | Step |
| --- | --- |
| `show` | a step adder itself (`r.c.show(tl)`). The stack fades in and the cards fan out from a closed pile, 0.6 s. With reduced motion the fanned stack fades in |
| `pull(i)` | returns a step adder. Card `i` (from 0) turns upright, rises by 15 % of its height and grows to 1.2 ×, on top, 0.6 s, with a 4 px `--k-accent` edge (its border and an outline, so nothing moves). The other cards dim under a `--k-bg` layer at 45 %. A card pulled before goes back to its place in the same step. With reduced motion the cards cut to their place; the dim still fades. An index outside the cards throws `cardStack: no card <i>` |
| `back` | a step adder itself. The pulled card goes back to its place and all cards light up again |

### Limits

- The fan spreads the cards up to 8° apart and 32° from the left card to the right card, about a point 40 % of a card's height below the stack. The fan reaches past `x` and `x + w` on both sides: at the defaults with five cards, about 175 px each side. The pulled card grows about the same point, so its top rises above `y`: about 210 px at the defaults. Keep that room free.
- Only the top card and the pulled card show their text in full; the others are mostly behind it. The text is not fitted: keep each card to a word or two.

## `fanPose`

`fanPose(i, n)` gives card `i`'s lean in a fan of `n`, in degrees. It is what `cardStack` draws; the unit test checks that the fan is symmetric.
