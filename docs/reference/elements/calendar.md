# Calendar: `calendar`

A month on a grid, for plans that are about days: deadlines, sprints, course dates. `mark` lights one day with a short label; `span` lays a bar across a run of days, one piece per week, drawn left to right. The newest mark or span keeps its accent until the next one; earlier ones stay as a tint. For a plan over months, use [`roadmap`](roadmap.md).

Catalog: section `305-roadmap` (`#/roadmap/calendar/5`).

## `calendar`

Only in `scene.ts`. From `decks/demo/sections/305-roadmap/40-calendar/scene.ts`:

```ts
import { calendar, type CalendarHandle } from "klappe/fx";

build(ctx) {
  const c = calendar(ctx, { month: "2026-11", x: 260, y: 90, w: 1400, h: 780 });
  return { c, kickoff: c.mark("2026-11-02", { label: "Kick-off" }), sprint: c.span("2026-11-04", "2026-11-17", { label: "Sprint 12" }) };
},
steps: [(tl, r) => r.c.show(tl), (tl, r) => r.kickoff(tl), (tl, r) => r.sprint(tl)],
```

Make the `mark` and `span` steps in `build`, as above: each makes its elements when it is called.

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `month` | string | required | `"YYYY-MM"`. The title (month and year) and the weekday names come from the deck language |
| `weekStart` | `0` \| `1` | `1` | the first column: `1` Monday, `0` Sunday |
| `x`, `y`, `w`, `h` | number | required | the area, scene units: a 60-unit title, a 40-unit weekday band, then one row per week the month touches (4 to 6), seven days across |

### Step adders

| Handle | Step |
| --- | --- |
| `show` | the title and weekday names fade in, then the day cells |
| `mark(date, { label? })` | the day (`"YYYY-MM-DD"`) gets an accent tint and an `--k-accent` edge with its label under the day number, 20 px on one line |
| `span(from, to, { label? })` | a bar in `--k-accent` across the days `from` to `to`, one piece per week row, each drawn left to right after the one before; the label sits in the first piece. Spans in one week stack upwards from the bottom of the cells |

Each new mark or span settles the one before: a mark's edge goes back to `--k-line`, a span's bars to the tint.

### Limits

- A month that is not `YYYY-MM` reports `calendar: month "<month>" is not YYYY-MM` and draws nothing. Days under 80 units wide report `calendar: a <w>px wide grid has days under 80px; widen the rect`.
- A date outside the month reports `calendar: <date> is not in <month>`; a span that ends before it starts `calendar: span from <from> ends before it starts (<to>)`. The step holds a beat.
- A label longer than its cell or bar ends in an ellipsis. Two or three spans fit in a week at the catalog's size; more cover the day numbers.
- One month only; no week view.

## `calendarLayout`, `calendarSpan`

`calendarLayout(month, weekStart, rect)` gives `{ days, rows, title, weekdays, problems }`, each day with its `col`, `row` and box. `calendarSpan(layout, from, to)` gives a span's pieces as `{ row, from, to }` columns. Their unit test uses them.
