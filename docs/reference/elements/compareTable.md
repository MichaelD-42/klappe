# Comparison table: `compareTable`

A feature matrix. A header row names the columns; each step adds one row, and its ticks and crosses land cell by cell.

Catalog: section `298-table-card` (`#/table-card/compare/2`).

## `compareTable`

Only in `scene.ts`. Shortened from `decks/demo/sections/298-table-card/10-compare/scene.ts`:

```ts
import { compareTable, type CompareTableHandle } from "klappe/fx";

build: (ctx) => ({
  t: compareTable(ctx, {
    x: 160, y: 300, w: 1600, h: 620,
    columns: ["Starter", "Team", "Business"],
    rows: [
      { label: "Single sign-on", cells: [false, true, true] },
      { label: "Audit log", cells: [false, "30 days", "1 year"] },
    ],
  }),
}),
steps: [
  (tl, r) => r.t.show(tl),
  (tl, r) => r.t.row(0)(tl),
  (tl, r) => r.t.row(1)(tl),
],
```

`compareTable(ctx, { columns, rows, x, y, w, h })` returns `{ el, show, row(i), column(i) }`; `el` is the table's block, for a scene that places or moves it.

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `columns` | `string[]` | required | the header of each value column; the label column has no header |
| `rows` | `{ label, cells }[]` | required | one row per entry; each cell is `true` (a tick), `false` (a cross) or a string (that text) |
| `x`, `y`, `w` | number | required | the table's top-left corner and width, scene units |
| `h` | number | none | the height the table must fit; the table sits centred in it |

### Step adders

| Handle | Step |
| --- | --- |
| `show` | fades in the header (in `--k-muted`) and the line under it; the rows stay hidden |
| `row(i)` | fades row `i` in and lands its marks one cell after the other: ticks in `--k-ok`, crosses in `--k-bad`. The row's label is lit in `--k-accent` until the next `row` step settles it to `--k-fg` |
| `column(i)` | lights column `i` (from 0): a band in `--k-accent` at `MARKER_MIX` with a 3 px `--k-accent` edge behind the column, from above its header through the last row, and the header in `--k-accent`; the column lit before goes back, and the row lit by the step before settles to `--k-fg`. `column(null)` lights none. For the plan you recommend, at the end. A column that is not there shows `compareTable: no column i`. Catalog: `#/table-card/compare/6` |

The cue follows the order of the steps, not the order the adders were made in. With reduced motion the marks fade in without the pop. A tick and a cross have the spoken names "yes" and "no" from the strings table.

### Limits

- Text is 36 px and shrinks to 20 px (14 px at 1366) to fit `h`. If it still does not fit, the deck shows `compareTable: N rows do not fit Hpx at 20px text` and nothing draws.
- A row with more or fewer cells than `columns` shows `compareTable: row i has N cells for M columns`; extra cells are dropped.
- `row(i)` of a row that is not there shows `compareTable: no row i`.
- Long labels and cell texts wrap.
