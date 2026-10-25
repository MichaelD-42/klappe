# Roadmap: `roadmap`

A time axis with month ticks, milestones that appear one per step, and a "today" marker that moves step by step. Dates are written in the deck language (`lang` in `deck.md`). For a day's time slots use `agenda`; for messages between actors use `sequence`.

Catalog: section `305-roadmap` (`#/roadmap/release/1`).

## `roadmap`

Only in `scene.ts`. From `decks/demo/sections/305-roadmap/10-release/scene.ts`:

```ts
import { roadmap, type RoadmapHandle } from "klappe/fx";

build: (ctx) => ({
  r: roadmap(ctx, {
    x: 160, y: 160, w: 1600, h: 760,
    today: "2026-07-20",
    milestones: [
      { id: "kick", date: "2026-07-01", label: "Kick-off" },
      { id: "beta", date: "2026-09-15", label: "Beta for first customers" },
    ],
  }),
}),
steps: [
  (tl, r: { r: RoadmapHandle }) => r.r.show(tl),
  (tl, r) => r.r.reveal("kick")(tl),
  (tl, r) => r.r.reveal("beta")(tl),
  (tl, r) => r.r.move("2026-10-24")(tl),
],
```

### Options

| Name               | Type                    | Default  | Meaning                                                                                                                          |
| ------------------ | ----------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `x`, `y`, `w`, `h` | numbers                 | required | the area; the top 72 px hold the today label, the axis runs across the middle of the rest                                        |
| `milestones`       | `{ id, date, label }[]` | required | `date` as `"YYYY-MM-DD"`; in date order they sit above, below, above the axis and so on                                          |
| `today`            | `"YYYY-MM-DD"`          | required | where the today marker starts. The deck gives it, never the wall clock, so seek equals play and every run shows the same picture |

A date that is not a real `"YYYY-MM-DD"` throws `roadmap: date "<date>" is not YYYY-MM-DD`.

### Handle

| Handle       | Step                                                                                                                                                                                                                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `show`       | a step adder itself (`r.r.show(tl)`): the axis and its month ticks fade in, then the today marker. No milestone shows yet                                                                                                                                                                             |
| `reveal(id)` | the milestone's dot pops onto the axis and its stem and label (date over title) fade in. Dot, stem and title take `--k-accent`, the date stays `--k-muted`; they settle on the next roadmap step. With reduced motion the dot shows at once. An unknown id throws `roadmap: unknown milestone "<id>"` |
| `move(date)` | the today marker slides to `date` in 1.2 s, in `--k-accent` until the next roadmap step; its date counts along. With reduced motion it jumps. A date off the axis shows `roadmap: today "<date>" is outside the axis` and the marker stops at the axis end                                            |
| `el`         | the today marker's element                                                                                                                                                                                                                                                                            |

### Limits

- The axis spans whole months, from the first month of the earliest date (milestones and `today`) to the end of the latest. A `move` date later than that is off the axis: put the date in a milestone or in `today` to widen it.
- Ticks fall on month starts, every 1, 2, 3, 6 or 12 months, at least 120 px apart. The first tick and each January show the year.
- The marker reads "today" in the deck language (`Intl.RelativeTimeFormat`), over the date. All dates are UTC, so a viewer's time zone never shifts one by a day.
- A label is up to 300 px wide, less when a neighbour on its side is closer. It is centred on its dot, so at the axis ends it reaches past the area by up to 150 px: leave that margin. Two milestones on one side closer than 176 px show `roadmap: milestones "<a>" and "<b>" are too close`.
- Titles wrap and shrink from 28 px to the 20 px floor. One that still needs more than 3 lines, or more than its band's height, shows `roadmap: label of "<id>" too long`. Fitting happens when the first step is added.

## `roadmapLayout`

`roadmapLayout({ milestones, today, x, w }, lang?)` gives `{ start, end, px, ticks, milestones, today, problems }`: the axis span (UTC ms), the date-to-x function, the ticks `{ x, label }`, each milestone's `{ id, label, x, above, left, width, date }` in date order, the today x and the too-close problems. It is what `roadmap` draws; tests use it.
