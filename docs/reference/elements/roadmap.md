# Roadmap: `roadmap`

A time axis with month ticks, milestones that appear one per step (or a range of them in one step, faster and faster), and a "today" marker that moves step by step. Dates are written in the deck language (`lang` in `deck.md`). For a day's time slots use `agenda`; for messages between actors use `sequence`.

Catalog: section `305-roadmap` (`#/roadmap/release/1`; `rush`: `#/roadmap/rush/3`).

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
| `milestones`       | `{ id, date, label, status? }[]` | required | `date` as `"YYYY-MM-DD"`; in date order they sit above, below, above the axis and so on. An empty `label` makes a dot (see Limits). `status` `"done"`, `"risk"` or `"late"`: the dot settles in `--k-ok`, `--k-warn` or `--k-bad` instead of `--k-line` after its reveal step, and a check, a warning triangle or a clock in that tone stands before the date, spoken "done", "at risk" or "late" (from the strings table). Another value reports `roadmap: status "<s>" of "<id>" is not done, risk or late`. Catalog: `#/roadmap/release/3` |
| `phases` | `{ id, from, to, label }[]` | none | spans as bars under the axis, each from the start of `from` through the end of `to` (`"YYYY-MM-DD"`), its label inside in bold. A phase that starts before another one ends takes the next lane down. With phases, every labelled milestone sits above the axis; a dot stays on it. Ids are shared with the milestones: one id is not both. A phase that ends before it starts throws `roadmap: phase "<id>" ends before it starts`. Catalog: `#/roadmap/spans/1` |
| `today`            | `"YYYY-MM-DD"`          | required | where the today marker starts. The deck gives it, never the wall clock, so seek equals play and every run shows the same picture |

A date that is not a real `"YYYY-MM-DD"` throws `roadmap: date "<date>" is not YYYY-MM-DD`.

### Handle

| Handle       | Step                                                                                                                                                                                                                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `show`       | a step adder itself (`r.r.show(tl)`): the axis and its month ticks fade in, then the today marker. No milestone shows yet                                                                                                                                                                             |
| `reveal(id)` | the milestone's dot pops onto the axis and its stem and label (date over title) fade in. Dot, stem and title take `--k-accent`, the date stays `--k-muted`; they settle to `--k-line` and `--k-fg` on the next roadmap step. With reduced motion the dot shows at once. An unknown id throws `roadmap: unknown milestone "<id>"`. A phase (`reveal("pilot")`) grows from its start in 0.9 s, its border `--k-accent` on a `--k-accent` tint, and settles to `--k-line` on `--k-surface` on the next roadmap step; with reduced motion it fades in at full length |
| `rush(from, to)` | the milestones from id `from` to id `to`, in date order, land in one step as `reveal` lands one: the first at once, each next one 0.7 times the gap before (0.6 s, 0.42 s, …), with its dot popping harder and its label popping out and back. All stay in `--k-accent` until the next roadmap step. With reduced motion the timing stays, the dots show at once and the labels do not pop. An unknown id throws `roadmap: unknown milestone "<id>"`; `from` after `to` throws `roadmap: rush "<from>" comes after "<to>"` |
| `move(date)` | the today marker slides to `date` in 1.2 s, in `--k-accent` until the next roadmap step; its date counts along. With reduced motion it jumps. A date off the axis shows `roadmap: today "<date>" is outside the axis` and the marker stops at the axis end                                            |
| `el`         | the today marker's element                                                                                                                                                                                                                                                                            |

To show that things speed up, land the first milestone alone and the rest in one `rush`. From `decks/demo/sections/305-roadmap/20-rush/scene.ts`, nine releases over six years:

```ts
steps: [
  (tl, r: { r: RoadmapHandle }) => r.r.show(tl),
  (tl, r) => r.r.reveal("a")(tl),
  (tl, r) => r.r.rush("b", "i")(tl),
],
```

A few labels and many dots show the pace. From `decks/demo/sections/305-roadmap/20-rush/scene.ts`:

```ts
milestones: [
  { id: "a", date: "2020-06-15", label: "Release A" },
  { id: "x1", date: "2024-08-01", label: "" }, // a dot
  { id: "x2", date: "2024-12-05", label: "" },
  { id: "i", date: "2026-05-15", label: "Release I" },
],
```

### Limits

- The axis spans whole months, from the first month of the earliest date (milestones and `today`) to the end of the latest. A `move` date later than that is off the axis: put the date in a milestone or in `today` to widen it.
- Ticks fall on month starts, every 1, 2, 3, 6 or 12 months, at least 120 px apart, counted from January so every January has one. The first tick and each January show the year. On an axis longer than 12 months, milestone dates show the year too.
- The marker reads "today" in the deck language (`Intl.RelativeTimeFormat`), over the date. All dates are UTC, so a viewer's time zone never shifts one by a day.
- A label is up to 300 px wide, less when a neighbour on its side is closer. It is centred on its dot, so at the axis ends it reaches past the area by up to 150 px: leave that margin. Two milestones on one side closer than 176 px show `roadmap: milestones "<a>" and "<b>" are too close`.
- A milestone with `label: ""` is a dot: only the dot on the axis, with no stem, label or date. A dot takes no side, so the labelled milestones still alternate among themselves. A dot is not in the spacing check or the label width, and a dot may share its x with any milestone. `reveal` and `rush` show dots like the others, in `--k-accent` until the next roadmap step.
- A phase label is one line, 24 px, shrinking to the 20 px floor to fit its bar; one still too long shows `roadmap: label of phase "<id>" too long for its bar` and ends in an ellipsis. More lanes than fit under the axis (48 px each, from 52 px below it) show `roadmap: <n> phase lanes do not fit under the axis`. With phases, two milestones closer than 176 px are too close, since all sit on one side.
- Titles wrap and shrink from 28 px to the 20 px floor. One that still needs more than 3 lines, or more than its band's height, shows `roadmap: label of "<id>" too long`. Fitting happens when the first step is added.

## `roadmapLayout`

`roadmapLayout({ milestones, today, x, w }, lang?)` gives `{ start, end, px, ticks, milestones, today, problems }`: the axis span (UTC ms), the date-to-x function, the ticks `{ x, label }`, each milestone's `{ id, label, x, above, left, width, date, dot }` in date order (a dot has `width` 0 and no date), the today x, each phase's `{ id, label, lane, left, width }` in start order, and the too-close problems. It is what `roadmap` draws; tests use it.
