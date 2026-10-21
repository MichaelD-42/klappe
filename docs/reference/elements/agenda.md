# Agenda: `agenda`

A list of time ranges with the current row marked. Past rows are `--k-muted`, the current row `--k-accent` with a marker bar, future rows `--k-fg`.

Catalog: section `310-checklist-agenda` (`#/checklist-agenda/day-agenda/1`).

## Markdown

A list of `HH:MM–HH:MM title` items in `scene.md`; the arrow `←` marks the current row. The step fades the rows in, then the marker slides down from the first row to the current one. Without an arrow there is no marker. From `decks/demo/sections/310-checklist-agenda/20-day-agenda/scene.md`:

```md
- 09:00–09:45 Basics
- 09:45–10:30 Practice ←
- 10:30–11:00 Wrap-up
```

## `agenda`

In `scene.ts`: `agenda(ctx, { rows, x, y, w, h, current })` returns `{ show, el, rows }`. `el` is the root element. `rows` holds one element per row, in order: a scene can move or mark a row with `tl.to(a.rows[1], { x: 20 })`.

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `rows` | `{ from, to, title, current }[]` | required | the rows, in order |
| `x`, `y`, `w` | number | required | the agenda's top-left corner and width, scene units |
| `h` | number | none | the height the rows must fit |
| `current` | string | the row marked `current` | the title of the current row |

### Step adders

| Handle | Step |
| --- | --- |
| `show` | fades the rows in, then slides the marker to the current row |

### Limits

- A `current` that matches no title shows `agenda: no row "<title>"`; the rows draw with no marker.
- Text is 40 px and shrinks to 20 px (14 px at 1366) to fit `h`. If it still does not fit, the deck shows `agenda: N rows do not fit Hpx at 20px text` and nothing draws.
- Long titles wrap; times sit in a right-aligned column.
