# Exercise card: `exerciseCard`

A card for a hands-on task: a title, the time box and the group with icons, a numbered task list, and optional items that follow one per step.

Catalog: section `298-table-card` (`#/table-card/exercise-card/1`).

## `exerciseCard`

Only in `scene.ts`. Shortened from `decks/demo/sections/298-table-card/20-exercise-card/scene.ts`:

```ts
import { exerciseCard, type ExerciseCardHandle } from "klappe/fx";

build: (ctx) => ({
  c: exerciseCard(ctx, {
    x: 360, y: 280, w: 1200, h: 640,
    title: "Map the release steps",
    minutes: 15,
    group: "pairs",
    tasks: ["List every step from merge to production.", "Mark the steps a person does by hand."],
    extras: ["Time the slowest step on your last release."],
  }),
}),
steps: [
  (tl, r) => r.c.show(tl),
  (tl, r) => r.c.extra(0)(tl),
],
```

`exerciseCard(ctx, { title, tasks, extras, minutes, group, x, y, w, h })` returns `{ el, show, extra(i) }`; `el` is the card's block, for a scene that places or moves it.

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `title` | string | required | the card's heading |
| `tasks` | `string[]` | required | the numbered tasks, shown with the card |
| `extras` | `string[]` | none | optional items, marked `+` in `--k-accent`, hidden until `extra(i)` |
| `minutes` | number | none | the time box, shown as "15 min" next to a clock icon; "min" comes from the strings table |
| `group` | string | none | who works together, shown as written next to a people icon |
| `x`, `y`, `w` | number | required | the card's top-left corner and width, scene units |
| `h` | number | none | the height the card must fit |

Without `minutes` and `group` the card has no meta line. The card does not count down: for a running clock, add a [timer](timer.md).

### Step adders

| Handle | Step |
| --- | --- |
| `show` | fades the card in with its title, meta line and tasks |
| `extra(i)` | fades optional item `i` in, with a short rise; with reduced motion only the fade |

### Limits

- Text is 36 px (the title 1.35 times that) and shrinks to 20 px (14 px at 1366) to fit `h`. If it still does not fit, the deck shows `exerciseCard: "title" does not fit Hpx at 20px text` and nothing draws.
- The hidden extras keep their room, so the card does not grow when one appears.
- `extra(i)` of an item that is not there shows `exerciseCard: no extra i`.
