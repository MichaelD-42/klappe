# Effects

The M2 effects of `klappe/fx`. Each is a function you call in `build(ctx)` of a `scene.ts`. It builds its DOM hidden and returns a handle; the handle's methods are step adders that only add tweens. Rects and positions are scene-local, in 1920x1080 units. Colours are `var(--k-*)` tokens, see [themes](themes.md). The ten newer elements have their own pages in `elements/`; hand-written tweens are in [motion](motion.md).

Every example below is a scene from the demo deck's catalog (the sections after the story, from `110-chart` on), trimmed to the call and its steps. Run it with `npm run dev`.

## `chart`

Catalog: section `110-chart` (`#/chart/bars/1`, `#/chart/donut/1`, `#/chart/funnel/1`, `#/chart/slope/1`, `#/chart/sankey/1`, `#/chart/scatter/1`, `#/chart/bubble/1`, `#/chart/radar/1`, `#/chart/heatmap/1`, `#/chart/treemap/1`). A bar, stacked, line, waterfall, timeline, donut, slope, funnel, sankey, scatter, bubble, radar, heatmap or treemap chart from a `data/` file. In Markdown, a list item linking to `data/x.csv` or `data/x.json` makes a bar chart (see [markdown](markdown.md)).

From `decks/demo/sections/110-chart/10-bars/scene.ts`:

```ts
import { chart } from "klappe/fx";

build: (ctx) => chart(ctx, { src: "data/chart-bar.csv", type: "bar", rect: { x: 160, y: 100, w: 1600, h: 820 }, title: "Units by quarter" }),
steps: [(tl, c) => c.axes(tl), (tl, c) => c.grow(tl), (tl, c) => c.values(tl)],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `src` | string | required | the data file as written in the Markdown link, `"data/x.csv"` |
| `type` | `"bar"`, `"stacked"`, `"line"`, `"waterfall"`, `"timeline"`, `"donut"`, `"slope"`, `"funnel"`, `"sankey"`, `"scatter"`, `"bubble"`, `"radar"`, `"heatmap"`, `"treemap"` | `"bar"` | the chart form. `radar`: each row a dimension round the circle from 12 o'clock, clockwise, 3 to 12 of them; one or two number columns as series, none below zero, each a closed shape in `--k-series-1` and `-2` with a legend; rings from zero at the value ticks, numbered for two series; one series shows its values inside its corners instead. `heatmap`: rows down, number columns across, up to 24 each; each cell shaded from near `--k-bg` (the lowest value) to `--k-accent` (the highest), a ramp from the lowest to the highest value in the legend row, the column names above and the row names left; a value shows in its cell where it fits. `treemap`: the first number column as tiles (none below zero, a total above zero, up to 40), largest top left; a second text column makes two levels: the first column names the groups, each a block under its name with its tiles in one `--k-series-N` colour, the second names the tiles. A tile shows its name, value and share where they fit, in the ink that reads on it. `scatter`: the first two number columns as x and y, one dot per row named by the first column, both axes spanning the data (not zero), each named by its column; a name sits right of its dot, or left of it near the right edge. `bubble`: the same with a third number column as the dot's area (none below zero), noted as `Size: <column>`. Either may have a time column named `period`, `year`, `date`, `month`, `quarter` or `week`: then each name needs exactly one row per period, the dots show the first period, `period()` moves them, the axes and sizes span every period, and the period shows under the plot. `bar` and `waterfall` use the first number column; `stacked` and `line` use all; `timeline` reads a start and an end per row: the columns named `start`, `from` or `begin` and `end`, `to` or `until`, else the first two number columns. `donut`: the first number column as parts of one whole, up to 6 rows, none below zero; the total sits in the centre and a legend gives each name, value and share. `slope`: the first two number columns as before and after, one line per row; its value axis spans the data, not zero; rising lines are `--k-ok`, falling ones muted, with a legend; labels that would touch are moved apart. `funnel`: the first number column as stages in row order, up to 8, none below zero, not all zero; each stage is a centred bar as wide as its share of the largest, with its name on the left and its value inside the bar's right end in `--k-bg` or `--k-fg`, whichever contrasts more with the bar (on a `--k-bg` halo when neither reaches 4.5:1), or just right of the bar when it is too narrow; the conversion from the stage before sits centred on the line between the two stages (`–` after a zero stage). `sankey`: the columns by position as source, target and value (a name like `2024` stays a name), values above zero; nodes sit in columns by their longest path from a node with no inflow, in order of first appearance; each band is as thick as its value; nodes in `--k-series-2` to `--k-series-6` (series 1 is the accent in most themes, which `highlight` uses), less the one nearest `--k-accent` when it is close (`sankeyPalette`), so past four or five nodes the colours repeat; bands in `--k-line`; see `highlight` |
| `rect` | `{ x, y, w, h }` | required | where the chart sits |
| `title` | string | none | shown above the plot |
| `data` | `Row[]` or `null` | read `src` from `ctx.files.data` | rows you parsed yourself; `null` says the file is missing |
| `sample` | boolean | false | show the "Sample data" label. It also shows when the file has the line `# source: klappe demo sample` |
| `group` | string | none | `scatter` and `bubble`: a text column whose values colour the dots, one `--k-series-N` colour each (repeating past six), with a legend. A name with rows in several periods takes the group of its first row. Catalog: `#/chart/scatter/1`. A column that is not there reports `chart: no group column "<name>" in <src>`; another chart type `chart: group is for scatter and bubble charts` |
| `lines` | `{ value, label }[]` | none | `bar`, `stacked`, `line`, `waterfall`, `slope` and `timeline`: a dashed `--k-fg` line across the plot at each value (a goal, last year, a limit; on a timeline a "today" down the plot), its label in bold at the line's right end (a timeline's: at its top). They show with `axes`, and the value axis reaches them. Catalog: `#/chart/bars/1`. Another type reports `chart: lines are for bar, stacked, line, waterfall, slope, timeline charts, not <type>` |
| `columns` | string[] | none | `bar` and `donut`: the number columns the chart moves through, by header name (`["2024", "2025"]`). The first shows at `grow`; `to(name)` moves to another. The value axis spans all of them, so a bar compares across the step, and the shown column's name stands in bold in the legend row. A name that is not a number column reports `chart: columns: no number column "<name>" in <src>`; another type `chart: columns are for bar and donut charts, not <type>`. Catalog: `#/chart/years/2` |

The first column labels the rows; every later column with a number in any row is a series and must be a number in every row. Columns keep the header's order, also when a name looks like a number (`team,2024,2025`); rows you pass as `data` keep their object's key order, which puts such names first, so give them a `data/` file instead.

### Step adders

| Handle | Step |
| --- | --- |
| `axes` | title, legend and axes fade in |
| `grow` | bars, segments, lines or waterfall steps grow in, staggered; donut slices draw round one after another; slope lines draw left to right; funnel stages grow from the centre, top to bottom; sankey nodes grow with their names, then the bands draw left to right |
| `values` | the value labels fade in and count up |
| `highlight(row)` | lights one row (0 is the first row after the header) and lets the one lit before go back; `highlight(null)` lights none. A sankey: the flow in that row turns `--k-accent`. Any other type: that row's marks and values (a bar, a stack, a slice, a stage, a phase, a slope line, a dot) stay at full strength and the rest dims to 0.35. In a `line` chart the argument is a series, 0 the first number column. Catalog: `#/chart/series/4`, `#/chart/slices/5`. Add it after the marks and values are shown: `values` after it brings the dimmed values back to full. A row that does not exist reports `chart: no row <i>; the rows are 0 to <last>` (`no series` for a line, `no flow in row <n>` for a sankey) |
| `period(p)` | `scatter` and `bubble` with a time column: the dots and their names move to period `p`, by index (0 is the first) or by its name (`"2025"`); a numeric period counts on the way, a named one switches halfway. Catalog: `#/chart/bubble/2`. Without a time column it reports `chart: period() is for a scatter or bubble chart with a period column`; a period that is not there `chart: no period "<p>"; the periods are …` |
| `bar(i)` | `bar`, `waterfall`, `stacked`, `timeline`, `funnel` and `treemap`: bar `i` (0-based, data order; a waterfall's total is the last; a stacked chart's whole stack; a funnel's stage with the conversion into it; a treemap's tile with its name) grows and its values count up. Call it once per step instead of `grow` and `values`, or for the first bars before a `grow` and `values` that bring the rest. Catalog: `#/chart/bar-steps/1`, `#/chart/treemap/2`. Another type reports `chart: bar(<i>) is for bar, waterfall, stacked, timeline, funnel and treemap charts`; a bar that does not exist reports `chart: no bar <i>` |
| `slice(i)` | `donut` only: slice `i` draws round, its value and share in the legend count up, and the total in the centre counts on from the slices the steps before drew. Call it once per step instead of `grow` and `values`, after `axes`, which shows the legend names. Catalog: `#/chart/slices/2` |
| `series(i)` | `line` and `radar`: series `i` (0 is the first number column) draws with its markers and values (a line left to right, a radar shape from the centre). Call it once per step instead of `grow` and `values`. Catalog: `#/chart/series/2` |
| `cell(row, col)` | `heatmap` only: an outline in `--k-fg` moves to the cell in row `row` (0 is the first row after the header), column `col` (0 is the first number column), from where the steps before left it; `cell(null)` hides it. Catalog: `#/chart/heatmap/4`. Another type reports `chart: cell() is for a heatmap`; a cell that does not exist `chart: no cell <row>, <col>` |
| `to(column)` | `bar` and `donut` with `columns`: the bars grow or shrink to that column's values (a donut's slices turn to its shares) over 1.2 s, from the column the steps before left, and the values, shares and total count there; the column name in the legend row switches halfway. For a before and after on one chart. Catalog: `#/chart/years/2`. A column not in `columns` reports `chart: no column "<name>" in columns; they are …` and holds a beat; a chart without `columns` reports `chart: to() needs a bar or donut chart with columns` |

### Limits

- A missing file, an empty file or bad data shows a large box (DATA MISSING or DATA ERROR with the reason) and a deck problem, `chart: <label>: <src> (<why>)`. It never plots around a bad cell.
- Text is 22 scene units (15.6 px at 1366). A `# source:` comment line in the CSV goes to the speaker notes.
- Scatter and bubble names that would touch move apart up and down, in each period (`tagSpread`); a name can then sit a little off its dot's line. Without `group` every dot is `--k-series-1` (a bubble at 75 % opacity with a `--k-bg` edge): colour carries no meaning there.
- A radar reads 3 to 12 dimensions and up to 2 series; a heatmap up to 24 rows and 24 columns; a treemap up to 40 tiles (DATA ERROR past these). A treemap tile too small for its name shows none: merge the small ones into Other.
- A funnel reads up to 8 stages. A sankey reads up to 16 nodes, 6 columns and 8 nodes in one column; it refuses a cycle and a node that flows into itself (DATA ERROR with the reason).

## `kpi`, `waffle`, `progress`

Catalog: section `115-numbers` (`#/numbers/kpis/1`, `#/numbers/shares/1`). Single numbers for a board slide. Each takes its numbers directly; `source` goes to the speaker notes ("origin not stated" without it), as a chart's does. Each returns `{ show, to }`. `show` fades it in and its number counts up from 0, written from `onUpdate` as a pure function of progress. `to(value)` gives a step that moves it on from where the steps before left it, for a before and after on one tile: the KPI's number counts there and its change against `previous` switches halfway; the waffle's cells fill on, or empty from the last one back; the ring closes or opens, turning `--k-ok` as it reaches the target and back to the accent as it leaves it. Several `to` calls in one step play one after another. Catalog: `#/numbers/shares/2`.

```ts
kpi(ctx, { x: 710, y: 200, w: 500, value: 9.5, unit: "days", label: "Lead time", previous: 12.5, better: "down", spark: [14, 13, 12.5, 11, 10, 9.5], source: "…" })
waffle(ctx, { x: 200, y: 160, size: 520, value: 37, label: "of releases needed a rollback" })
progress(ctx, { x: 1100, y: 160, size: 520, value: 72, target: 100, label: "Services moved" })
```

| Element | Options | Shows |
| --- | --- | --- |
| `kpi` | `x`, `y`, `w` (480), `value`, `label`, `unit?`, `previous?`, `better?` (`"up"`), `spark?`, `source?` | a `--k-surface` tile: the label, the number (112 px, its unit smaller on the same line), the change against `previous` (`▲ 12 %`, in `--k-ok` when it goes the `better` way, else `--k-bad`; against 0 it is in units), and a sparkline of `spark` (oldest first) that draws on, its last point in `--k-accent` |
| `waffle` | `x`, `y`, `size`, `value`, `of?` (100), `label?`, `source?` | a 10x10 grid, one cell per percent of `of`, filling in `--k-accent` row by row; the share in % beside the label |
| `progress` | `x`, `y`, `size`, `value`, `target`, `label?`, `source?` | a ring that closes to `value / target` in `--k-accent` (full and `--k-ok` at or past the target); the share in % and "of <target>" in its centre, the label under it |

## `gauge`

Catalog: section `115-numbers` (`#/numbers/gauge/1`). One reading against a fixed range, as a half-circle dial: load, use of capacity, a score. Sits beside `kpi` and `progress`.

From `decks/demo/sections/115-numbers/30-gauge/scene.ts`:

```ts
build: (ctx) => gauge(ctx, { x: 560, y: 140, size: 800, value: 68, max: 100, unit: "%", label: "Build farm load" }),
steps: [(tl, g) => g.show(tl), (tl, g) => g.to(91)(tl)],
```

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `x`, `y` | number | required | the top-left corner |
| `size` | number | required | the dial's width; it is half as high, with the number and the label under it |
| `value` | number | required | where `show` swings the needle to |
| `min`, `max` | number | `min` 0, `max` required | the dial's range, written at its ends |
| `label`, `unit`, `source` | string | none | as for `kpi` |
| `bands` | `{ to, tone }[]` | none | zones from `min`, each up to its `to`, in `tone` `"ok"`, `"warn"` or `"bad"`: a thin ring inside the track, toned toward `--k-bg` so the arc and needle stay strongest. A band whose `to` does not rise from the one before (or leaves the range), or another tone, reports `gauge: band to <to> (<tone>) must rise from the band before, within <min> to <max>, in ok, warn or bad` and is left out. Catalog: `#/numbers/gauge/2` |

| Handle | Step |
| --- | --- |
| `show` | the gauge fades in; the needle and the `--k-accent` arc swing from `min` to `value` over the `--k-line` track, and the number counts up |
| `to(value)` | the needle swings on, from where the steps before left it, to `value`; the number counts there. Call it once per step for each new reading |

Numbers use the deck language's format (`72,5` in a German deck). A value outside the range parks the needle at the end, and the number still shows the real value. A `max` at or below `min` reports `gauge: max <max> must be above min <min>`. With reduced motion the needle jumps.

## `likert`

Catalog: section `115-numbers` (`#/numbers/likert/1`). Survey answers on an agree scale, 5 points by default or 4 to 7 with `scale`: one row per statement, its answers as a 100 % bar from disagree (`--k-bad`) through neutral (`--k-line`, the middle of an odd scale) to agree (`--k-ok`), and the agree share (the top half of the points: two of 4 or 5, three of 6 or 7) at its end. A scale without a middle, 4 or 6 points, makes the room choose a side. One person's answer is a row with a single count of 1.

Shortened from `decks/demo/sections/115-numbers/40-likert/scene.ts`:

```ts
build: (ctx) => ({ h: title(ctx), l: likert(ctx, { x: 160, y: 320, w: 1600, rows: [{ statement: "Releases are predictable", counts: [3, 5, 8, 22, 12] }, …] }) }),
steps: [(tl, r) => (r.h.show(tl), r.l.show(tl)), (tl, r) => r.l.row(0)(tl), (tl, r) => r.l.row(1)(tl), (tl, r) => r.l.row(2)(tl)],
```

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `x`, `y`, `w` | number | required | the top-left corner and the width |
| `rows` | `{ statement, counts }[]` | required | `counts`: how many gave each point, disagree first: one count per point of the scale |
| `scale` | string[] | `Strongly disagree` … `Strongly agree` | the point names in the legend, 4 to 7 of them; they set how many points the scale has. Fewer or more names report a deck problem and the 5 default names show |
| `source` | string | none | as for `kpi` |

| Handle | Step |
| --- | --- |
| `show` | the legend, the statements and their empty tracks fade in |
| `row(i)` | row `i`'s bar grows from the left (fades in with reduced motion) and its agree share counts up |

A row whose counts are not one number of 0 or more per point reports a message starting `likert: row <n> needs <points> counts of 0 or more` and stays empty. A `scale` of fewer than 4 or more than 7 names reports a message starting `likert: scale needs 4 to 7 point names`. A row index with no row reports `likert: no row <n> (row(<i>)); there are <count> rows`. Both messages count rows from 1, as a reader does: `row(0)` is row 1. The default point names come from the deck language: klappe has English and German (`de`); any other language shows the English names.

## `gaugeAngle`

`gaugeAngle(value, min, max)` gives the needle's angle in degrees from straight up: -90 at `min`, 90 at `max`, clamped to the dial.

## `likertShares`

`likertShares(counts)` gives each point's share of the row's answers, 0 to 1; all 0 when nobody answered.

## `kpiDelta`

`kpiDelta(value, previous, better?)` gives the change's text (`▲ 12 %`) and whether it is good: `better` `"down"` makes a fall good. Against a previous value of 0 the change is in units.

## `waffleCells`

`waffleCells(value, of)` gives the waffle's filled cells: one per percent of `of`, rounded, 0 to 100.

## `barRace`

Catalog: section `110-chart` (`#/chart/race/1`). Ranked bars that reorder from one period to the next: who led, who climbed. The data file has one row per period (the first column names it: a year, a quarter) and one number column per contender.

```ts
build: (ctx) => barRace(ctx, { src: "data/teams.csv", rect: { x: 160, y: 80, w: 1600, h: 840 }, title: "Deployments a week", top: 6 }),
steps: [(tl, r) => r.show(tl), (tl, r) => r.to(1)(tl), (tl, r) => r.to("2023")(tl)],
```

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `src`, `data`, `rect`, `title`, `sample` | | | as for `chart` |
| `top` | number | 8 | how many bars show; the others wait below the frame and climb in when they rank |

| Handle | Step |
| --- | --- |
| `show` | the title, the value axis (on top) and the first period's bars fade in; the period stands large in the corner |
| `to(period)` | the bars move to that period, by index or by name: they change rank and length together over 1.2 s, the values count, and a numeric period (a year) counts too. Call it once per step, or several times in one step for a run of periods |
| `periods` | not a step: the period names, in order |

The value axis is fixed over all periods, so a bar's length compares across time. Each contender keeps its colour, from the theme's six series colours; past six they repeat, and the names label every bar. A period that does not exist reports `barRace: no period "2030"; the periods are …`. The data is checked as for `chart`; it needs at least two contender columns.

## `raceRanks`

`raceRanks(values)` gives each value's place, 0 for the largest; ties keep column order.

## `parseCsv`

`parseCsv(text)` reads a CSV string into rows (`Record<string, string | number>[]`): the first non-comment line is the header, a cell that is a finite number becomes a number. Lines starting with `#` are comments; `# source: <origin>` before the header rides on the result as `.source`. Quoted commas are not supported. The header's column order rides on the result too, for `keysOf`. Use it to read a `data/` file for an effect that is not a chart:

```ts
build: (ctx) => ({ rows: parseCsv(ctx.files.data["data/units.csv"] ?? "") }),
```

## `keysOf`

`keysOf(rows)` gives a table's column names in order: the header's for rows from `parseCsv`, else the first row's keys. JS lists object keys that look like numbers (`"2024"`) first, so a header such as `team,2024,2025` needs the header's order to keep `team` as the label. `chart` and `wordCloud` use it.

## `dataError`

`dataError(rows, type)` returns why the rows cannot be drawn as that chart type (`"row 3, Q2 not a number"`, `"needs a start and an end column"`, `"row 2, end before start"`), or `""`. `chart` calls it; call it yourself to check data before you pass it as `data`.


## `scatterTracks`

`scatterTracks(rows)` gives `{ period?, periods, names, at, keys }`: the time column's name (if any) and its periods in order, the point names, `at[p][i]` the number values of point `i` in period `p`, and `keys` the number columns other than the time, in order (x, y, size). Without a time column every row is a point and `at` has one period. What `scatter` and `bubble` draw; tests use it.
## `tagSpread`

`tagSpread(tags, gap)` takes scatter names as `{ x, y, w, left }` (`x` where a name starts, or ends for a `left` name; `w` its width) and gives each name's `y` so that no two names whose boxes overlap sideways sit closer than `gap`. Touching names move apart as `spread` moves labels, group by group, until none touch. The scatter and bubble charts use it in every period.

## `donutSlices`

`donutSlices(values)` gives each value's slice as `{ start, end, share }`, fractions of a turn from 12 o'clock, clockwise, in row order.

## `spread`

`spread(ys, gap)` moves label positions apart until each is at least `gap` from the next, keeping their order; a bunch that has to move stays centred on where it was, and labels already far enough apart stay put. The slope chart uses it for its labels.

## `waterfallSteps`

`waterfallSteps(deltas)` gives each delta's bar as `[from, to]`: the running total before it and after it. `waterfallSteps([5, -2])` is `[[0, 5], [5, 3]]`.

## `barInk`

`barInk(bar, bg, fg)` takes three colours (`#rgb`, `#rrggbb` or `rgb()`) and gives `"var(--k-bg)"` or `"var(--k-fg)"`, whichever contrasts more with `bar`, or `null` when neither reaches 4.5:1 or a colour cannot be read. The funnel chart (`#/chart/funnel/1`) uses it for the values inside its bars; the unit test checks it on every built-in theme.

## `sankeyPalette`

`sankeyPalette(accent, series)` takes the accent and the node colours (`#rgb`, `#rrggbb` or `rgb()`) and gives the indices of the colours to use: all of them, less the one nearest the accent when it is nearer than 64 in RGB, so no node looks like a lit flow (daylight drops `--k-series-5`). Colours in another form are kept. The sankey chart (`#/chart/sankey/1`) uses it.

## `funnelLayout`

`funnelLayout(values)` gives each stage as `{ share, conversion }`: its width as a share of the largest stage, and its value over the stage before (`null` for the first stage and after a zero stage). `funnelLayout([200, 100, 25])` is `[{ share: 1, conversion: null }, { share: 0.5, conversion: 0.5 }, { share: 0.125, conversion: 0.25 }]`. The funnel chart (`#/chart/funnel/1`) uses it.

## `sankeyLayout`

`sankeyLayout(links, gap)` lays out `{ source, target, value }` links: `{ nodes, links, columns }`. Each node has `name`, `depth` (its column), `value` (the larger of its inflow and outflow) and `y0`, `y1` in 0..1 of the height; each link has its node indices `s` and `t`, its `value`, the band's top at each end `sy`, `ty` and its thickness `w`. `gap` is the space between nodes in a column, as a share of the height. The same links always give the same layout. It returns a string instead when the links have a cycle, a self-loop, or more nodes, columns or nodes per column than the sankey reads. The sankey chart (`#/chart/sankey/1`) uses it.

## `chartDomain`

`chartDomain(rows, type)` gives `[min, max]` of the value axis before it is rounded to nice ticks. Zero is always inside, except for `timeline`.

## `showsSample`

`showsSample(sample, source)` is true when `sample` is true or the data's `# source:` line contains "klappe demo sample". It decides whether `chart` shows the "Sample data" label.

## `worldMap`

Catalog: section `150-map` (`#/map/world/1`). A world map drawn as land lines, with sites, arcs and a camera zoom to one site.

From `decks/demo/sections/150-map/10-world/scene.ts`:

```ts
import { worldMap, type WorldMapHandle } from "klappe/fx";

build: (ctx) => worldMap(ctx, { rect: { x: 60, y: 40, w: 1800, h: 880 }, sites, arcs: toHost }),
steps: [
  (tl, m: WorldMapHandle) => m.draw(tl),
  (tl, m: WorldMapHandle) => sites.forEach((s) => m.site(tl, s.id)),
  (tl, m: WorldMapHandle) => toHost.forEach((a) => m.arc(tl, a.from, a.to)),
  (tl, m: WorldMapHandle) => m.zoomTo(tl, "s2"),
  (tl, m: WorldMapHandle) => m.world(tl),
],
```

where `sites` is `[{ id: "s1", label: "[Site 1]", lon: 10, lat: 50 }, …]` and `toHost` is `[{ from: "s2", to: "s1" }, …]`.

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `rect` | `{ x, y, w, h }` | required | the whole globe, fitted into this rect |
| `sites` | `{ id, label?, lon, lat, major? }[]` | required | places; a site without a finite `lon` and `lat` is a deck problem and left out. Without `label` the map draws no text for it, for a deck that places its own labels. `major: true` gives its label a second, larger form that reads at world zoom (24 units, 17 px at 1366, on a `--k-bg` halo): it shows with `site()`, hides while `zoomTo` is in and comes back with `world()`. Keep it to a few sites far apart: the labels are not moved apart. Catalog: `#/map/world/2` |
| `arcs` | `{ from, to }[]` | none | arcs created at load; `arc` then only draws them |

### Step adders

| Handle | Step |
| --- | --- |
| `draw` | the land draws on (2.4 s) |
| `site(tl, id)` | the site's dot pops in |
| `arc(tl, from, to, at?)` | the arc draws on, at `at` on the timeline (default: the end). An arc not in `arcs` is created on the spot; declare arcs to keep step functions tween-only |
| `point(id)` | the site's `[x, y]`, scene-local, where its dot sits: place your own figures, labels and routes with it. Unknown id: `undefined` and a deck problem |
| `arcPath(from, to)` | the path data of the map's arc between two sites, for a figure's `walk` or your own drawing |
| `zoomTo(tl, id)` | the camera flies to the site; only that site's label shows; strokes thin to keep their weight |
| `region(tl, country, { share? })` | fills a country in `--k-accent` at `MARKER_MIX` (35 %), under the coastline, fading in over 0.6 s. `share`, 0 to 1, shades it by value instead: from a 15 % mix at 0 to 85 % at 1, for a map of revenue or headcount by country; scale the values to 0 to 1 yourself and say what full means, as the map draws no legend. A later `region` on a filled country moves its fill to the new share over 0.6 s (catalog `#/map/world/7`); a share outside 0 to 1 reports `worldMap: region '<country>' share <share> is not 0 to 1` and fills at 35 %; "where we sell". `country` is the name as `world-atlas` spells it (`"Germany"`, `"United States of America"`, `"Dem. Rep. Congo"`) or the ISO 3166-1 numeric code (`"276"`); ISO letter codes are not known. A country the atlas lacks shows `worldMap: no country '<name>'; use the ISO 3166-1 numeric code or the name in world-atlas`. The 1:110m atlas leaves out the smallest states. Catalog: `#/map/world/6` |
| `world` | labels fade out, the camera frames the whole scene again |

### Limits

- Labels are 8 map units, which reads only at the `zoomTo` zoom (22.8 px at 1366); at world zoom they are hidden, except the larger label of a `major` site.
- An unknown site id is a deck problem (`worldMap: unknown site '<id>'`).

## `fitProjection`

`fitProjection(rect)` gives the d3 projection `worldMap` uses, with the globe fitted into `rect`. `fitProjection(rect)([lon, lat])` is the `[x, y]` of a place that is not a site. For a site, use the handle's `point(id)`.

## `arcPath`

`arcPath([ax, ay], [bx, by])` gives the SVG path data of the arc `worldMap` draws: a quadratic curve that bows upward by a quarter of its length. Between two sites, the handle's `arcPath(from, to)` gives the same.

## `figure`

Catalog: section `130-figure` (`#/figure/walk/1`). A stick figure that appears and walks along a path.

From `decks/demo/sections/130-figure/10-walk/scene.ts`:

```ts
import { figure } from "klappe/fx";

build: (ctx) => ({ f: figure(ctx, { x: 260, y: 860, color: "var(--k-fg)" }) }),
steps: [(tl, { f }) => f.appear(tl), (tl, { f }) => f.walk(tl, "M260 860 C 700 600, 1200 960, 1660 720", { duration: 3 })],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `x`, `y` | number | required | where the feet stand |
| `color` | string | required | stroke colour, a token such as `"var(--k-fg)"` |
| `scale` | number | 1 | size; scaling is about the feet |
| `strokeWidth` | number | 4 | line weight in figure units, before `scale`: raise it for a small figure |
| `seated` | boolean | `false` | seated from load, on a chair (see `sit`): people at a meeting table |

### Step adders

| Handle | Step |
| --- | --- |
| `appear(tl, at?)` | fades in (0.5 s), at `at` on the timeline (default: the end) |
| `walk(tl, path, { duration, at? })` | the feet follow `path`, a path string or an SVG path element you drew (`decks/demo/sections/130-figure/20-path`); the limbs swing as a pure function of progress |
| `gather(tl, x, y, at?, duration?)` | walks in a straight line to `(x, y)`; `duration` defaults to 1.2 s |
| `sit(tl, at?)`, `stand(tl, at?)` | sits down where it stands, or stands up, over 0.6 s: the hips come down 45 units, the thighs (seen from the front) shorten, the knees part, and a chair shows under it; the feet stay put. `walk` and `gather` only from standing. Catalog: `#/figure/table/3` |

The handle's `el` is the figure's root group, for a scene that dims or moves it (`tl.to(f.el, { opacity: 0.3 })`).

### Limits

The path must be in the figure's coordinate space (`ctx.svg`, scene-local); a path under a transformed ancestor lands elsewhere.

## `limbAngle`

`limbAngle(progress, steps, swing = 25)` gives the limb angle in degrees at walk progress `progress` for `steps` strides: `swing * sin(progress * steps * 2π)`. Zero at progress 0 and 1, so a walk starts and ends upright. It is what `figure` writes from `onUpdate`.

## `travel`

Catalog: section `285-travel` (`#/travel/parcel/2`, `#/travel/parcel/3`). One step: an element travels along a path, a parcel to a customer or a reply back. The route can show or draw on behind it. For a figure that walks, use `figure().walk`: its legs stride.

From `decks/demo/sections/285-travel/10-parcel/scene.ts`:

```ts
import { iconTile, travel } from "klappe/fx";

build: (ctx) => {
  const parcel = iconTile(ctx, "package", { x: 0, y: 0, size: 88, tone: "warn" });
  return { parcel, ship: travel(ctx, parcel.el, { path: "M410 700 C 800 260, 1150 900, 1546 420", route: "draw", duration: 2.5 }) };
},
steps: [(tl, r) => r.parcel.draw(tl), (tl, r) => r.ship(tl)],
```

`travel(ctx, el, opts)` returns a step adder. `el` is an HTML element in `ctx.html` or an SVG element in `ctx.svg`. Call it in `build`: the element waits at the start of the path from load until its step.

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `path` | string or SVG path element | required | an SVG `d` in scene units, or a path in `ctx.svg` whose `d` is read |
| `duration` | number | 2 | seconds, with a soft start and stop (`power1.inOut`) |
| `route` | `"show"` or `"draw"` | none | a string path only: the route is a `--k-line` line that shows from load (`"show"`), or that is hidden and draws on behind the element as it goes (`"draw"`). A path element you pass stays as you made it; draw it with `drawOn` |
| `rotate` | boolean | false | the element turns to face along the path (its right side leads) |

With reduced motion the element jumps to the end of the path and a `"draw"` route shows whole.

### Limits

- The path moves the element's origin: put an HTML element at `left: 0; top: 0` with its visual centred there (as `flow` does its packets), and an SVG one with its centre at `(0, 0)`, as `iconTile(ctx, name, { x: 0, y: 0, … })` makes it. Its own `x` and `y` are overwritten.
- A path element under a transformed ancestor lands elsewhere: its `d` is read as scene units.
- A path with no length reports `travel: path has no length` and the step only holds.

## `lineArt`

Catalog: section `120-draw` (`#/draw/desk/1`). A line drawing from an SVG file, drawn stroke by stroke, with one part that can glow. It is for trusted, author-supplied SVG only: it strips scripts, styles, handlers, animations (`set`, `animate`), images and links to other files (an `href` must be `#id`), but is not a full sanitizer. Shapes inside `defs`, `clipPath`, `mask`, `pattern` and `marker` keep their own fill and are not drawn on.

From `decks/demo/sections/120-draw/10-desk/scene.ts`:

```ts
import { lineArt } from "klappe/fx";
import desk from "klappe/fx/art/engineer-desk.svg?raw";

build: (ctx) => lineArt(ctx, { src: desk, x: 360, y: 100, w: 1200 }),
steps: [(tl, a) => a.draw(tl), (tl, a) => a.glow(tl, ".bulb")],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `src` | string | required | the SVG file's content, imported with `?raw` |
| `x`, `y` | number | required | top-left corner of the drawing |
| `w` | number | required | width; the viewBox maps to it and the height follows |

### Step adders

| Handle | Step |
| --- | --- |
| `draw` | every stroke draws on, one after another (`drawOn`) |
| `glow(tl, selector)` | the matching parts turn amber (`--k-warn`) and glow, with the shared [`glow`](elements/attention.md); no match is the deck problem `lineArt glow: nothing matches '<selector>'` |

### Limits

A source that is not an SVG with a viewBox shows `lineArt: the source is not an SVG with a viewBox`. Strokes take `--k-fg`, round caps and joins; an exporter's own fill and stroke colours are replaced.

## `drawOn`

Catalog: section `120-draw` (`#/draw/shapes/1`). Draws any stroked SVG shapes from start to end, one after another, and ends on a plain stroke. It returns a step adder: call it with the timeline; it returns the time the draw starts. A stroke shorter than 0.5 units (an icon's dot) has nothing to draw and fades in at its turn instead. Shapes in `text`, `defs`, `clipPath`, `mask`, `pattern` and `marker` are left out.

From `decks/demo/sections/120-draw/30-shapes/scene.ts`:

```ts
import { drawOn } from "klappe/fx";

steps: [(tl, r) => drawOn(r.plain)(tl), (tl, r) => drawOn(r.thin.children, { duration: 0.5, each: 0.3 })(tl)],
```

`drawOn(els, opts?)` takes one element or a list; it draws the `path`, `line`, `polyline`, `polygon`, `circle`, `rect` and `ellipse` in them, never `text`.

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `duration` | number | 0.9 | seconds per shape |
| `each` | number | 0.06 | stagger between shapes |
| `at` | GSAP position | the end | where the draw starts |

A shape with `vector-effect="non-scaling-stroke"` is measured when the step is added, so do not tween an SVG ancestor's transform before the draw. A zero-length stroke fades in instead.

## `cleanSvg`

`cleanSvg(svg, animated)` strips what an exported SVG must not bring into the deck: scripts, `foreignObject`, images, handlers (`on…`), `javascript:` and links to other files (only `#id` stays). `lineArt` calls it with `animated` false, which also drops `<style>` and every animation. An animated background calls it with `animated` true: `<style>` stays (scoped in a shadow root) without `@import` or outside `url()`, and SMIL animations stay, except any that animates a link or a handler.

## `icon`

Catalog: section `140-icons` (`#/icons/icons/1`). Any Lucide icon, drawn on and lit.

From `decks/demo/sections/140-icons/10-icons/scene.ts`:

```ts
import { icon } from "klappe/fx";

build: (ctx) => [
  icon(ctx, "lightbulb", { x: 360, y: 500, color: "var(--k-fg)" }),
  icon(ctx, "cpu", { x: 660, y: 500, size: 160, color: "var(--k-accent)" }),
],
steps: [(tl, icons) => icons.forEach((i, n) => i.draw(tl, n ? "<" : undefined)), (tl, icons) => icons.forEach((i, n) => i.light(tl, n ? "<" : undefined))],
```

`icon(ctx, name, { x, y, size?, color })`: `name` is a Lucide name in kebab case (`"shield-check"`) or the icon itself (`import { ShieldCheck } from "klappe/fx/lucide"`); `x`, `y` is the centre; `size` defaults to 96; `color` is required. An unknown name draws a crossed box and reports `icon: unknown Lucide name '<name>'`.

Only the icons a deck uses are bundled. The build finds a name when it stands in the deck's code as a string literal (`"rocket"`, also inside an array or a flow node). A name built at run time (`"ro" + "cket"`, or read from a file) is not found and reports the unknown-name problem: pass the icon itself instead. The same holds for `iconTile` and the `icon` of a `flow` node.

| Handle | Step |
| --- | --- |
| `draw(tl, at?)` | the strokes draw on; closed shapes fill to 20% |
| `light(tl, at?)` | a glow in the icon's colour, the fill rises to 45% |

`at` is a GSAP position, default the end. Each call leaves a marker at its own start, so `"<"` on the next icon starts it together: a row draws as one.

## `iconTile`

Catalog: section `140-icons` (`#/icons/tiles/1`). An icon on a tile with a soft glow, a gradient well and a hairline edge.

From `decks/demo/sections/140-icons/20-tiles/scene.ts`:

```ts
import { iconTile } from "klappe/fx";

build: (ctx) => iconTile(ctx, "lightbulb", { x: 300, y: 500, tone: "accent" }),
steps: [(tl, t) => t.draw(tl), (tl, t) => t.light(tl)],
```

`iconTile(ctx, name, { x, y, size?, tone })`: `tone` is a theme token, short (`"accent"`, `"ok"`, `"warn"`) or full (`"--k-accent"`). Prefer the colour tokens: the CRT ones (`"phosphor"`, `"phosphor-amber"`) stay bright in every theme and wash out on a light stage; an unknown tone falls back to accent with the problem `iconTile: unknown tone '<tone>'`. `size` defaults to 96; the glyph is 60% of it. `draw` and `light` are as for `icon`.

## `iconGlyph`

`iconGlyph(name, problem)` gives a Lucide icon as SVG markup on its 24x24 grid, for your own inline SVG. An unknown name calls `problem` with `icon: unknown Lucide name '<name>'` and gives a crossed box.

## `image`

Catalog: section `230-fullscreen` (`#/fullscreen/cover/1`). A picture from `media/`, either in a rect or full-frame. In Markdown, `![alt](media/x.png "prompt")` shows one in the right-hand slot; a full-frame picture or a background needs `scene.ts` or `section.ts`.

From `decks/demo/sections/230-fullscreen/10-cover/scene.ts`:

```ts
import { image } from "klappe/fx";

build: (ctx) =>
  image(ctx, {
    href: "media/fullscreen-hero.png",
    alt: "An engineering desk at night: CAD drawings on two monitors, a city skyline behind the window",
    fit: "cover",
    kenBurns: true,
    scrim: 0.6,
  }),
steps: [(tl, img) => img.show(tl)],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `href` | string | required | the file as in the Markdown link, `"media/x.png"` |
| `alt` | string | required | describes the picture; `""` for a decoration. Feeds the prompt in `media/TODO.md` |
| `rect` | `{ x, y, w, h }` | the whole scene frame | where the picture sits |
| `fit` | `"contain"`, `"cover"` | `"contain"` | `cover` fills the rect and crops |
| `kenBurns` | `true` or `{ from?, to? }` | none | a slow push on `show`; `true` is scale 1 to 1.08 with a small drift. Your own poses are `{ scale, x, y }`; a drift stays inside the push's overscan. Reduced motion leaves it out |
| `scrim` | number 0 to 1 | none | a `--k-scrim` layer over the picture (black, white in a light theme); use 0.6 or more for text on top |
| `scrimSide` | `"left" \| "right" \| "top" \| "bottom"` | none (flat) | the scrim covers only that side: full over the 45% of the frame there, clear by 85%. Keep the text inside that 45%; the rest of the picture keeps its light |
| `credit` | string | none | a credit line, `"Photo: …"`, 20 px in `--k-fg` on a 75 % `--k-bg` patch, 12 px in from the picture's bottom-right corner, so it reads on any photo. It stays put while Ken Burns pushes. It sits outside the safe area on a full frame on purpose (`data-k-bleed`); move a footer logo if they meet. Catalog: `#/fullscreen/cover/1` |

### Step adders

| Handle | Step |
| --- | --- |
| `show(tl, at?)` | fades the picture in. A full-frame picture (`cover`, no `rect`) starts with the step and fades in over the camera flight, slowly at first. With `kenBurns` the push starts when the fade-in ends and runs `KEN_BURNS` seconds |
| `hide(tl, at?)` | fades it out quickly |
| `move(tl, { duration }, at?)` | the push on its own, for `show`, `move`, `hide` on three steps (`decks/demo/sections/230-fullscreen/50-steps`). Do not set `kenBurns` and also call `move`: the push would start twice |

### Limits

- A missing file shows IMAGE MISSING over the picture's area and a deck problem; a `cover` image with alt text also shows a prompt for an image generator. `klappe test` writes it to `media/TODO.md`.
- For a sharp push at 1920 wide use a source of at least about 2080x1170 px.
- A background for a whole section is `background: { href, alt, scrim, kenBurns }` in `section.ts`, see [deck format](deck-format.md). A `.mp4` or `.webm` `href` or `animate: "aurora"` makes it move.

## `KEN_BURNS`

`KEN_BURNS` is 6, the seconds of the default push. `show()` with `kenBurns` plays it after the fade-in, so the step lasts the fade plus this.

## `video`

Catalog: section `190-media` (`#/media/youtube/1`). A video in a framed box with its title as a caption. In Markdown, a list item linking to YouTube, Vimeo, or a `.mp4` or `.webm` file shows one. YouTube links can be `watch?v=`, `youtu.be`, `shorts`, `music.youtube.com` or `youtube-nocookie.com` (which stays privacy-enhanced). A video host link with no video id, such as a channel page, shows VIDEO MISSING and a deck problem.

From the Markdown form, `decks/demo/sections/190-media/10-youtube/scene.md`:

```md
- [A sample YouTube video](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
```

In `scene.ts`:

```ts
build: (ctx) => video(ctx, { href: "media/clip.mp4", title: "A short clip", rect: { x: 960, y: 140, w: 800, h: 450 } }),
steps: [(tl, v) => v.show(tl)],
```

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `href` | string | required | a local `"media/x.mp4"`, a direct link, or a YouTube or Vimeo link |
| `title` | string | required | the caption under the box; the player's title in a full frame |
| `rect` | `{ x, y, w, h }` | the full scene frame | the area; the box is the largest 16:9 (later the clip's own ratio) inside it. Without `rect` the video fills the scene frame, cropped to cover, with no border or caption, and fades in over the camera flight like a full-frame picture (catalog `#/media/full-frame/1`) |
| `fallback` | string | none | an image href in `media/`, shown instead of an online video when there is no network; also the placeholder until the player loads; `?offline=1` forces it; offline without a usable fallback reports a deck problem |
| `autoplay` | boolean | `true` | a YouTube or Vimeo player starts when its step arrives, as a local file does, so a clicker is enough; when the viewer leaves the step it stops and shows its thumbnail again. A Markdown video link plays this way. `false`: the viewer starts the player with the mouse. Both start under reduced motion too |
| `muted` | boolean | `false` | `true`: an embedded player starts without sound. By default it starts with sound: the step key or click that starts it counts as the viewer's gesture. A browser can still block sound in a deck window that has had no key or click yet, such as one stepped only from the speaker view; then click into the deck window once. Local files ignore `muted` and play with sound |
| `start`, `end` | number | none | seconds into the clip: it starts at `start` each time its step arrives, and stops at `end`. A local file takes them as a media fragment (`#t=43,60`) and may run up to a quarter second past `end`; YouTube takes whole seconds (start rounded down, end up); Vimeo takes `start` only, and an `end` reports `video: a Vimeo player cannot stop at end; it plays on from start`. An `end` not after `start`, or a negative `start`, reports `video: start <s> and end <e> must be seconds, end after start`. Catalog: `#/media/youtube-autoplay/2` |

`show(tl)` fades the box in. The video plays when its step arrives and pauses (an embed: shows its thumbnail) when the viewer leaves; with `autoplay: false` the viewer starts an embedded player, and a click into it hands the keyboard back to klappe.

`play(tl)` starts the video on its own step instead: the box shows on `show`'s step and waits on its poster, the play step starts it, the step after stops it (catalog `#/media/youtube-autoplay/2`). It starts an embed with `autoplay: false` too. On a video that cannot play (missing, offline) it holds a beat. A missing local file shows VIDEO MISSING and a deck problem. An online link needs the network, which the speaker notes say.

## `wipe`

Catalog: section `230-fullscreen` (`#/fullscreen/wipe/2`). Before and after: two pictures from `media/` on one spot, cropped to cover it. The after picture is revealed from the left behind an `--k-accent` divider.

```ts
build: (ctx) => wipe(ctx, { before: { href: "media/old.png", alt: "…" }, after: { href: "media/new.png", alt: "…" } }),
steps: [(tl, w) => w.show(tl), (tl, w) => w.to(0.5)(tl), (tl, w) => w.to(1)(tl)],
```

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `before`, `after` | `{ href, alt }` | required | the two pictures; a missing one shows IMAGE MISSING and a deck problem, as `image` does |
| `rect` | `{ x, y, w, h }` | the full scene frame | the spot both pictures cover |
| `scrim` | number | none | 0 to 1, a `--k-scrim` layer on both pictures for text on top; 0.6 keeps theme text at 4.5:1 |
| `scrimSide` | `"left" \| "right" \| "top" \| "bottom"` | none | as for `image`: the scrim on that side only |
| `direction` | `"horizontal"` or `"vertical"` | `"horizontal"` | `"vertical"`: the after picture comes in from the top under a divider across the picture. Catalog: `#/fullscreen/wipe-down/2` |

| Handle | Step |
| --- | --- |
| `show` | both pictures and the divider fade in; only the before picture shows |
| `to(f)` | the divider sweeps to `f` (0 to 1) of the width and the after picture shows left of it: `to(0.5)` half, `to(1)` all, `to(0)` back to before |

## `loupe`

Catalog: section `236-loupe` (`#/loupe/detail/1` to `#/loupe/detail/3`). A magnifying lens over a picture from `media/`: a circle that shows the detail under its centre enlarged, ringed in `--k-accent`. Each step slides it to the next detail, so the room looks where you talk.

From `decks/demo/sections/236-loupe/10-detail/scene.ts`:

```ts
import { loupe } from "klappe/fx";

build: (ctx) => {
  const lens = loupe(ctx, { href: "media/fullscreen-hero.png", alt: "…", rect: { x: 160, y: 60, w: 1600, h: 860 }, fit: "cover", r: 160, zoom: 1.7, at: { x: 1328, y: 557 } });
  return { lens, chart: lens.to(1595, 404), sketch: lens.to(1165, 330) };
},
steps: [(tl, r) => r.lens.show(tl), (tl, r) => r.chart(tl), (tl, r) => r.sketch(tl)],
```

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `href`, `alt` | string | required | the picture, as for `image`; a missing file shows IMAGE MISSING and a deck problem, with no lens |
| `rect` | `{ x, y, w, h }` | the full scene frame | the picture's box |
| `fit` | `"contain"` or `"cover"` | `"contain"` | as for `image` |
| `r` | number | 140 | the lens radius in scene units |
| `zoom` | number | 2.5 | how much the lens enlarges |
| `at` | `{ x, y }` | the centre of `rect` | where the lens first shows, in scene units |

| Handle | Step |
| --- | --- |
| `show` | the picture fades in, then the lens |
| `to(x, y, { zoom? })` | `zoom`: this stop's own enlargement, the lens's `zoom` when left out. The lens slides so its centre is on the scene point `(x, y)`, with a soft start and stop over 1.2 s. With reduced motion it cuts there |

Make each `to` in `build` and call it in a step, as above. Points are scene units on the picture as it shows in `rect`: with `fit: "cover"` the picture is cropped, so check the points in the deck, not on the file.

Limits: the picture has no Ken Burns push (the enlarged copy would not follow it), and no scrim. A lens near the picture's edge shows `--k-bg` past it. The lens only enlarges the source pixels: for a sharp lens the source must be at least `zoom` times as wide as `rect` (scene units are pixels at 1920). The demo's 1672-pixel picture in a 1600-unit rect stretches about 1.6 times at `zoom: 1.7`, so its lens is a little softer than the picture; at 2.5 it would be blurred.

## `loupeOffset`

`loupeOffset({ x, y }, rect, r, zoom)` gives where the enlarged copy sits in a `loupe` lens (from the lens's top-left), so the scene point `(x, y)` shows at the lens centre.

## `qr`

Catalog: section `190-media` (`#/media/qr/1`). A QR code the room can scan, usually for a link.

```ts
build: (ctx) => qr(ctx, { text: "https://example.com/talk", x: 735, y: 180, size: 450, label: "Slides and notes" }),
steps: [(tl, h) => h.show(tl)],
```

`qr(ctx, { text, x, y, size, label? })`: `x`, `y` the top-left corner, `size` the code's width and height in scene units, `label` a line under it. Dark modules (`--k-bg`) on a light tile (`--k-fg`) with the standard 4-module quiet zone, because not every phone camera reads an inverted code. Error correction M: it still reads with 15 % of it covered. `show` fades it in. Text too long for any QR code reports `qr: the text is too long for a QR code (N characters)` and shows nothing. Keep `size` at 400 or more for a link, so the room can scan it from the back.

## `shatter`

Catalog: section `200-shatter` (`#/shatter/card/1`). A card you built cracks, cracks to its edges, then falls apart in shards.

From `decks/demo/sections/200-shatter/10-card/scene.ts`:

```ts
import { shatter, type ShatterHandle } from "klappe/fx";

build(ctx) {
  const el = document.createElement("div"); // a styled card, appended to ctx.html
  /* … */
  const fx = shatter(ctx, { target: el });
  gsap.set(el, { autoAlpha: 0 });
  return { el, fx };
},
steps: [
  (tl, { el }) => void tl.to(el, { autoAlpha: 1, duration: 0.6 }),
  (tl, { fx }) => fx.crack(tl),
  (tl, { fx }) => fx.crack2(tl),
  (tl, { fx }) => fx.fall(tl),
],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `target` | HTMLElement | required | an element inside the scene, not `ctx.html` itself; anything else throws `shatter: target must be an HTML element inside the scene, not the scene itself` |
| `impact` | `{ x, y }` | 65% across, 40% down the target | where the cracks start, scene-local |
| `shards` | number | 30 | roughly how many pieces |
| `fall` | number | 1 | a factor on the fall time (the shards fall for 1 to 1.9 s times this) |
| `toViewer` | number | 0.25 | the share of shards, nearest the impact, that tumble toward the viewer |
| `seed` | number | fixed | the same seed gives the same pattern |

### Step adders

`crack`, `crack2` and `fall` take the timeline. The target is measured as it looks at the end of the timeline so far (text written from `onUpdate` included), when the first of them is added.

### Limits

The shards copy the target as it is at that point; build and show it before the shatter steps. As a section entry it is `transition: "shatter"`, see `transitionShatter`.

## `shatterGeometry`

`shatterGeometry(w, h, impact, shards = 30, seed)` gives the crack and shard shapes for a `w` x `h` box: `cells` (the shard polygons, which tile the box), `cracks` (`{ pts, r }`, `r` the distance from the impact) and `reach` (impact to the farthest corner). It is pure; `shatter` uses it, and tests check that the shards tile the box.

## `shout`

Catalog: section `210-shout` (`#/shout/calm/1`). A shout-out: the room dims, a big question lands at full size, then the answer follows. In Markdown, `### Question?` and a paragraph make two steps, the question and the answer, with the deck's `intensity`.

From `decks/demo/sections/210-shout/20-bold/scene.ts`:

```ts
import { shout, type ShoutHandle } from "klappe/fx";

build: (ctx) => shout(ctx, { question: "Who owns the release?", answer: "The team that ships it.", intensity: "bold" }),
steps: [
  (tl, s: ShoutHandle) => s.enter(tl),
  (tl, s: ShoutHandle) => s.fade(tl),
  (tl, s: ShoutHandle) => s.answer(tl),
],
```

| Name | Type | Meaning |
| --- | --- | --- |
| `question` | string | the big text; long text gets a smaller size to stay in the frame |
| `answer` | string | shown in `--k-accent` at 70% of the question's size |
| `intensity` | `"calm"` or `"bold"` | the deck's (`deck.md`). Calm dims 30% and eases in; bold dims 70%, adds a vignette, enters hard and further, keeps a trace of the question after the fade and pops the answer |

| Handle | Step |
| --- | --- |
| `enter` | the dim and question come in and grow to full size: 1.04 calm, 1.12 bold (an earlier shout's answer leaves) |
| `fade` | optional, a pause beat between the two: the question fades (bold keeps a trace) |
| `answer` | the dim lifts and the answer builds in |

Text is set with `textContent`, never as HTML. Each handle you call is one entry in `steps`, so a shout with `fade` takes three steps in `scene.md` and one without it two. The demo's bold scene uses `fade`.

## `swarm`

Catalog: section `220-swarm` (`#/swarm/stream/1`). Seeded small documents stream from one area to a pile in another, drawn on a canvas.

From `decks/demo/sections/220-swarm/10-stream/scene.ts`:

```ts
import { swarm, type SwarmHandle } from "klappe/fx";

const s = swarm(ctx, { rect: FULL, from: FROM, to: PILE, seed: 1 });
steps: [(tl, { s }) => s.stream(tl, { duration: 2.5 })],
```

with `FULL = { x: 0, y: 0, w: 1920, h: 1080 }`, `FROM = { x: 160, y: 380, w: 400, h: 520 }` and `PILE = { x: 1384, y: 530, w: 352, h: 286 }`. Build the swarm first so labels you add after it paint above the canvas.

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `rect` | `{ x, y, w, h }` | required | the canvas area; it must contain `from` and `to` |
| `from`, `to` | `{ x, y, w, h }` | required | start area, and the area where the pile lands |
| `seed` | number | required | the same seed gives the same swarm |
| `count` | number | 2000 | how many documents; every 25th is a larger accent "key fact" |

`stream(tl, { duration })` fades the canvas in and streams all documents; each flies for 40% of the duration at its own start time. The picture is a pure function of progress, so a seek matches play. The backing store is capped at 2560 device pixels.

## `swarmPoint`

`swarmPoint(seed, i, p, from?, to?)` gives `{ x, y }` of document `i` at progress `p` (0 to 1). Pure: it starts at a seeded spot in `from`, leaves at a seeded time and lands on a heap at the bottom of `to`, on a curve inside the bounding box of the two. Without rects both are the unit square.

## `burst`

Catalog: section `220-swarm` (`#/swarm/burst/1`). Seeded confetti pops once from a point, for a milestone reached, drawn on a canvas in the theme's `--k-series-1` to `--k-series-6` (`--k-accent` if the theme has none).

From `decks/demo/sections/220-swarm/20-burst/scene.ts`:

```ts
import { burst, type BurstHandle } from "klappe/fx";

const b = burst(ctx, { origin: { x: 960, y: 470 }, seed: 7 });
steps: [(tl, { b, box }) => {
  tl.to(box, { autoAlpha: 1, scale: 1, duration: 0.5 });
  b.pop(tl, "<");
}],
```

Build the burst first so the text you add after it paints above the canvas.

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `origin` | `{ x, y }` | required | where the pieces pop from, scene px |
| `seed` | number | required | the same seed gives the same burst |
| `count` | number | 150 | how many pieces |
| `radius` | number | 360 | how far the pieces fly, scene px; the canvas is a square, 2 × radius wide, centred on `origin` |
| `duration` | number | 1.4 | seconds |

`pop(tl, at?)` adds the pop: the pieces fly out, slow down, fall a little, spin, and fade out over the last 30%. `at` is a timeline position, for example `"<"` to pop with the tween before. The canvas is empty before and after the pop.

It is decoration: the canvas sits under `data-k-ignore`, so the self-test snapshot leaves it out. The picture is still a pure function of progress (seeded, no `Math.random`), so a seek matches play; `tests/e2e/fx-burst.e2e.test.ts` checks that. With reduced motion `burst` makes no canvas and `pop` adds nothing, so pair it with a visible change in the same step (the demo fades in the number), and add that change first so `"<"` has a tween to join.

## `crt`

Catalog: section `180-crt` (`#/crt/power-on/1`). A retro terminal that powers on, types its lines one step at a time, and shows `READY.`.

From `decks/demo/sections/180-crt/10-power-on/scene.ts`:

```ts
import { crt, type CrtHandle, type CrtLine } from "klappe/fx";

const BOOT: CrtLine[] = ["DEMO-OS v1.0", "", { text: "MEMORY TEST: 640K OK", count: true }, "DRIVES A: B: C: ... OK"];

build: (ctx) => crt(ctx, { lines: BOOT }),
steps: [
  (tl, h: CrtHandle) => h.powerOn(tl),
  ...BOOT.map((_, i) => (tl, h: CrtHandle) => h.type(tl, i)),
  (tl, h: CrtHandle) => h.ready(tl),
],
```

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `lines` | `(string \| { text, count? })[]` | required | the text; `""` is a blank line. `{ text: "MEMORY TEST: 640K OK", count: true }` types its label, then counts the number up in 16K steps |
| `color` | `"green"` or `"amber"` | `"green"` | the phosphor, `--k-phosphor` or `--k-phosphor-amber` |

| Handle | Step |
| --- | --- |
| `powerOn` | a line flashes across and opens to a bright screen that settles to the glowing terminal |
| `type(tl, i)` | line `i` types at 34 characters a second (a count line takes 1.4 s more); `"all"` types every line in a row |
| `ready` | shows `READY.` and the cursor |

The font fits the lines, 46 px at most. If the lines need less than 20 px the deck shows `crt: N lines do not fit the screen even at 20 px; shorten or split them`. A count line that does not match `label: <number>K` (with an optional ` OK`) is reported as `crt: count line "<text>" needs a label and a number with K` and just types. Monospace is allowed only here. The same look is `transition: "crt"`, see `transitionCrt`.

## `typed`

`typed(full, p)` gives the first `round(p * length)` characters of `full`: the text of a line at typing progress `p`. `crt` writes it from `onUpdate`.

A typewriter in the deck font: `terminal` and `crt` type in a code font, and their fit maths assume its fixed character width. To type in `--k-font`, write `typed` into a `text()` box from `onUpdate` and mark the box `data-k-text`, so the self-test compares its text between play and seek. From `decks/demo/sections/217-chat/20-typewriter/scene.ts`:

```ts
build(ctx) {
  const box = text(ctx, { text: "", x: 160, y: 400, w: 1600, size: 72, weight: 700 });
  box.el.dataset.kText = "";
  return box;
},
steps: [
  (tl, box: BasicHandle, ctx) => {
    const line = ctx.doc!.steps[0].text;
    box.show(tl);
    tl.to({}, {
      duration: line.length / 20, // characters per second
      ease: "none",
      onUpdate(this: gsap.core.Tween) {
        box.el.textContent = typed(line, this.progress());
      },
    });
  },
],
```

A text that wraps reflows as it types; `chat` keeps a hidden full copy in the box to avoid that.

## `counted`

`counted(full, p)` is `typed` for a count line (`"MEMORY TEST: 640K OK"`): the label types, then the number counts up in 16K steps, then ` OK` shows at `p = 1`. Text that is not a count line is typed.

## `fitFont`

`fitFont(rows, cols, w, h)` gives `{ size, fits }`: the largest monospace size up to 46 px at which `rows` by `cols` fit `w` x `h`, at least `MIN_FONT`. `fits` is false when even `MIN_FONT` clips.

## `MIN_FONT`

`MIN_FONT` is 20, the smallest size `crt` text uses (14.2 px at 1366), the legibility floor.

## `morph`

Catalog: section `160-motion` (`#/motion/chain/1`). One element moves onto another and crossfades into it. Chains work: document to fact to card.

From `decks/demo/sections/160-motion/10-chain/scene.ts`:

```ts
import { morph } from "klappe/fx";

// doc, fact and card are boxes built in build(); the doc starts shown, the others hidden by morph
build(ctx) { /* … */ return { doc, a: morph(ctx, { from: doc, to: fact }), b: morph(ctx, { from: fact, to: card }) } },
steps: [(tl, { doc }) => tl.to(doc, { autoAlpha: 1, duration: 0.6 }), (tl, { a }) => a.play(tl), (tl, { b }) => b.play(tl)],
```

`morph(ctx, { from, to })` takes two elements, HTML or SVG (`60-motion/20-shape-morph`). `play(tl)` moves `from` onto `to` over 1.2 s (`power2.inOut`). `to` fades in first, over `from`, then `from` fades out, so one of them always shows strongly. Each scales uniformly, so text is never stretched: `from` by the smaller size ratio, so it ends inside `to`, and `to` from the larger, so it starts inside `from`. A transform you set yourself is kept. `to` is hidden until `play`. Build `morph` after both elements are in place: positions are measured when the step is added.

## `bubble`

Catalog: section `160-motion` (`#/motion/talk/1`). A speech bubble with an accent outline.

From `decks/demo/sections/160-motion/30-talk/scene.ts`:

```ts
import { bubble } from "klappe/fx";

q: bubble(ctx, { x: 400, y: 520, text: "A sample question for [Site 1]?", side: "right" }),
steps: [(tl, { q }) => q.show(tl), (tl, { q, a }) => (q.hide(tl), a.hide(tl, "<"))],
```

`bubble(ctx, { x, y, text, side })`: the tail points at `(x, y)`; `side` is `"right"` or `"left"`, where the bubble sits from that point. The text is 36 px, at most 640 px wide. `show(tl)` pops it in with `back.out(2)`; `hide(tl, at?)` fades it out, and `at` can be `"<"` to hide together with another bubble.

## `counter`

Catalog: section `160-motion` (`#/motion/counts/1`). A big number with a label that counts from one value to another.

From `decks/demo/sections/160-motion/40-counts/scene.ts`:

```ts
import { counter } from "klappe/fx";

down: counter(ctx, { x: 620, y: 600, from: 128, to: 0, label: "Open questions (sample)" }),
steps: [(tl, { down }) => down.run(tl)],
```

`counter(ctx, { x, y, from, to, label, decimals?, prefix?, unit? })` is centred on `(x, y)`; the number is 144 px in `--k-accent`, the label 36 px. `prefix` (`"€"`, `"≈"`) and `unit` (`"%"`, `"days"`) sit before and after the number on its line, at 52 px; they do not count. `decimals` (default 0) is how many places it shows, always that many, so `4.2` counts up as `0.0`, `0.1` and so on. `run(tl)` fades it in and counts over 1.8 s, written from `onUpdate` as a pure function of progress. `to(value)` gives a step that counts on from where the steps before left it (`to` after `run`) to `value`, over 1.8 s, for a before and after on one number; several in one step play one after another. Catalog: `#/motion/counts/3`. Numbers use the deck language's separators.

## `scramble`

Catalog: section `160-motion` (`#/motion/decode/1`). A line that decodes: random glyphs in `--k-accent` settle, about left to right, on the real text in `--k-fg`.

```ts
build: (ctx) => scramble(ctx, { text: ctx.doc!.steps[0].text, x: 160, y: 420, w: 1600 }),
steps: [(tl, s) => s.run(tl)],
```

`scramble(ctx, { text, x, y, w?, size?, seed? })`: `x`, `y` the top-left corner; `w` the width it wraps at (default to the scene's right edge); `size` the font size (default 72, weight 700); `seed` picks the glyphs and the order. `run(tl)` fades it in and decodes over 1.5 s, written from `onUpdate` as a pure function of progress. Each character is laid out from the start, so the line never reflows while it decodes. Screen readers get the real text. Reduced motion: it fades in already settled.

## `handwrite`

Catalog: section `238-handwriting` (`#/handwriting/note/1`). A short phrase that writes itself in a hand font, glyph by glyph, left to right.

```ts
build: (ctx) => handwrite(ctx, { text: ctx.doc!.steps[0].text, x: 160, y: 300, size: 128 }),
steps: [(tl, h) => h.write(tl)],
```

`handwrite(ctx, { text, x, y, size?, color?, seed? })`: `text` is a string, whose lines are its line breaks (the source lines of a list item, as `reveal` reads them), or a list of strings, one line each; lines are trimmed and empty ones dropped. `x`, `y` the top-left corner; `size` the font size (default 96, Caveat weight 700); `color` a `--k-*` token (default `--k-fg`); `seed` varies each glyph's share of the time (0.8 to 1.2 of the average; default 1). A line never wraps. `write(tl)` shows it and uncovers each glyph in turn with a clip wipe from its left edge, line after line, 0.09 s a character, 0.6 s to 4 s a line; a space or a line break is a short pause. The wipe is written from `onUpdate` as a pure function of progress (`handwriteGlyphs`). The clip is in percent of each glyph's own box, so the font swapping in late keeps every glyph's share right; the box is absolutely placed, so nothing else moves. `el` is the text box; screen readers get the text, its lines joined by spaces. Reduced motion: the phrase fades in whole. The font, Caveat, ships with klappe from `@fontsource/caveat` under the SIL Open Font License 1.1 (OFL-1.1); it loads only when a deck calls `handwrite`.

## `reveal`

Catalog: section `215-reveal` (`#/reveal/quote/1`, `#/reveal/statement/1` and `#/reveal/kinetic/1`). A statement or a quote whose lines, or words, rise in one after another, in `--k-fg`.

From `decks/demo/sections/215-reveal/10-quote/scene.ts`, with the quote as one list item on three source lines in `scene.md`:

```ts
build: (ctx) => reveal(ctx, { text: ctx.doc!.steps[0].text, x: 160, y: 340, size: 72, delay: 0.4 }),
steps: [(tl, r) => r.run(tl)],
```

`reveal(ctx, { text, x, y, w?, size?, by?, delay? })`: `text` is a string, whose lines are its line breaks (the source lines of a list item), or a list of strings, one line each; empty lines are dropped. `x`, `y` the top-left corner; `w` the width it wraps at (default to the scene's right edge); `size` the font size (default 56, weight 600). `by` is `"line"` (default) or `"word"`: what rises as one. `delay` is the seconds `run` holds before the first unit rises (default 0). A section's first step plays under the section fade (0.4 s), so give a reveal there `delay: 0.4`, or its first line has risen before the room sees it. The units are the source lines or the words, never the lines the browser wraps to, so the reveal is the same with every font. A line too long for `w` wraps and rises as one block. `run(tl)` lifts each unit half its font size and fades it in over 0.9 s (`power2.out`), 0.3 s apart by line, 0.15 s apart by word. `el` is the text box. Reduced motion: the whole text fades in, already in place, after the same `delay`.

Key words: mark them `**bold**` in the list item, as in `- We do not ship **features**. We ship **outcomes**.` (`#/reveal/kinetic/1`). The markers never show. A key word is set at 1.15 times the font size, so the text leaves room for it and never reflows. It starts scaled down to the font size; 0.3 s after its unit starts to rise, it grows into its room and turns from `--k-fg` to `--k-accent` over 0.9 s. It keeps that look after the step. A marked phrase stresses each of its words. Punctuation outside the markers stays plain. This works `by: "word"` and `by: "line"`; by word, the stress lands on the word as it is read. Reduced motion: the key words are already grown and in the accent when the text fades in.

## `wordCloud`

Catalog: section `216-words` (`#/words/cloud/1`). Words from a `data/` file, sized by weight and placed without overlap. The heaviest word is `--k-accent`; the others cycle through `--k-series-2` to `--k-series-6` (in the bold theme `--k-series-1` is the accent).

From `decks/demo/sections/216-words/10-cloud/scene.ts`:

```ts
import { wordCloud } from "klappe/fx";

build: (ctx) => wordCloud(ctx, { src: "data/words.csv", rect: { x: 160, y: 80, w: 1600, h: 840 } }),
steps: [(tl, c) => c.show(0, 3)(tl), (tl, c) => c.show(3)(tl)],
```

`wordCloud(ctx, { src, rect, data?, max?, sample? })`: `src` is the data file, `"data/x.csv"`; its first column is the word and its first number column the weight, above zero. `data` takes rows you parsed yourself, `null` says the file is missing (as for `chart`). `max` is the heaviest word's font size (default `rect.h / 5`, at most 160). `sample` shows the "Sample data" label; it also shows when the file has the line `# source: klappe demo sample`. The label takes a 40-unit strip at the top of `rect`. The `# source:` line goes to the speaker notes.

| Handle | Step |
| --- | --- |
| `show(from?, to?)` | the words `from` to `to - 1` in weight order (0 is the heaviest) fade in and grow from 0.6 to full size, heaviest first, staggered over at most 1.2 s. Default: all. `show(0, 3)` then `show(3)` shows the top three, then the rest. A bare `show()` after `show(0, 3)` fades the top three in again: use `show(3)` |
| `words` | not a step: the words, heaviest first, the order `show` counts in |
| `el` | not a step: the box that holds the words |

Reduced motion: the words fade in at full size, all at once. A missing file or bad data shows a large box (DATA MISSING or DATA ERROR with the reason) and a deck problem, `wordCloud: <label>: <src> (<why>)`. A word that does not fit reports `wordCloud: <n> words of <src> do not fit in the rect`. At most the 60 heaviest words show; a longer file reports `wordCloud: <src> has <n> words; only the 60 heaviest show`. Words are horizontal only.

## `cloudLayout`

`cloudLayout(words, rect, max?)` places `{ text, weight }` words for `wordCloud`: `{ text, weight, size, x, y, w, h }` each, heaviest first, ties in input order. A word's font size follows the square root of its weight, so its area follows the weight; the smallest is 24. Each word goes on an Archimedean spiral out from the centre of `rect`, as wide as `rect`, at the first spot where its box is inside `rect` and touches no other box. A box is estimated, not measured, from character classes (font sizes per character: 1 for W, M, m, w and @; 0.36 for i, l, j, t, f, r, I and punctuation; 0.72 for capitals and digits; 0.62 for the rest) plus 0.3 font sizes, by 1.3 font sizes. So the layout is the same on every machine and in CI, whatever fonts and rasteriser the browser has. If a word does not fit, every size shrinks by 10 % and the layout starts again, up to 12 times; words that still do not fit are left out. Only the 60 heaviest words are placed. Nothing is random: the same words always give the same layout.

## `redline`

Catalog: section `218-redline-flap` (`#/redline-flap/redline/1`). Prose changes as a redline, the text cousin of `code().diff()`: deleted words struck through in `--k-bad`, new words underlined on a `--k-ok` tint, then the clean text.

From `decks/demo/sections/218-redline-flap/10-redline/scene.ts`:

```ts
build: (ctx) => redline(ctx, { before: "Every release is tested by hand on Friday …", after: "Every release is tested automatically on each commit …", x: 160, y: 300, w: 1600, size: 64 }),
steps: [(tl, r) => r.show(tl), (tl, r) => r.apply(tl), (tl, r) => r.clean(tl)],
```

`redline(ctx, { before, after, x, y, w?, size? })`: `before` and `after` the two texts, diffed by words (`wordDiff`); `x`, `y` the top-left corner; `w` the width it wraps at (default to the scene's right edge); `size` the font size (default 48, weight 600). `show(tl)` fades in the before text. `apply(tl)` draws a strike through each deleted word and dims it to 0.6; each new word takes its full width in one cut at the step's start, then fades in while its tint and underline draw on, over 0.9 s. `clean(tl)` fades the deleted words and the marks, then cuts the deleted words' width to 0, which leaves the after text. Every word of both texts is laid out at build; the text reflows only at those two cuts, never mid-tween, so no word shows half clipped and seek equals play. `el` is the text box; screen readers get the after text. Reduced motion: the marks fade in and out at full length, with no draw-on.

## `splitFlap`

Catalog: section `218-redline-flap` (`#/redline-flap/board/1`). An airport board: a row of cells that flip to a new word or number, in the `scramble` family.

From `decks/demo/sections/218-redline-flap/20-board/scene.ts`:

```ts
build: (ctx) => splitFlap(ctx, { x: 287, y: 360, cells: 10, text: "On time", size: 120 }),
steps: [(tl, f) => f.show(tl), (tl, f) => f.to("Boarding")(tl), (tl, f) => f.to("98.6% up")(tl)],
```

`splitFlap(ctx, { x, y, cells, text, size? })`: `x`, `y` the top-left corner; `cells` how many characters the board holds; `text` what it shows first; `size` the font size (default 96, weight 700; a cell is 1.05 by 1.3 times it, so the widest letters, W and M, fit in every theme font; anything wider is clipped at the cell's edge). Text is upper-cased (ß to ẞ, so a word keeps its length) and left-aligned; a text longer than `cells` reports the problem `splitFlap: '<text>' has <n> characters for <cells> cells; the rest is cut`. `show(tl)` fades the board in. `to(text)` gives a step that flips each cell forward through the drum (space, A to Z, Ä Ö Ü, 0 to 9, `.,:-+%/€$&?!`) to its new character over 1.8 s, each cell a little after the one to its left; a character not on the drum changes in one flip at its cell's end. Each cell's character is written from `onUpdate` as a pure function of progress (`flapGlyphs`), and the text a step flips from is read when the step is added, so `to` steps may be built in any order. A line across each cell's middle gives the split look. `el` is the row of cells. Reduced motion: the board cuts to the new text.

## `scrambleGlyphs`

`scrambleGlyphs(text, p, seed)` gives what each character shows at progress `p`: a glyph while it decodes, `null` once it has settled. Spaces are always `null`; all are `null` at `p = 1`.

## `handwriteGlyphs`

`handwriteGlyphs(text, p, seed)` gives how far each character of a `handwrite` is written at progress `p`: 0 hidden, 1 whole. Glyphs write one after another, left to right; all are 0 at `p = 0` and 1 at `p = 1`.

## `wordDiff`

`wordDiff(before, after)` gives the word diff `redline` draws: a list of `{ op: "keep" | "del" | "add", word }`, by longest common subsequence (`lineDiff` on the words). Words split on any whitespace; at a fork, deletions come before additions.

## `flapGlyphs`

`flapGlyphs(from, to, p, cells)` gives what each cell of a `splitFlap` shows at progress `p`: the upper-cased, padded `from` text at `p = 0`, the `to` text at `p = 1`.

## `counterText`

`counterText(from, to, p, lang?, decimals?)` gives the counter's text at progress `p`: `from + (to - from) * p` rounded to `decimals` places (default 0), with the language's separators. `counterText(0, 2000, 0.5)` is `"1,000"`; `counterText(0, 4.2, 1, "en", 1)` is `"4.2"`.

## Transitions

Set in `section.ts` with `transition` (see [deck format](deck-format.md)). The demo's transition gallery has one section per kind, from `#/tr-cut/cut-card/1` to `#/tr-magicmove/magicmove-card/1`: step forward through it to see each one (a jump is a cut). You rarely call these functions yourself. With reduced motion (the system setting or `?reducedmotion=1`), `zoom`, `crt`, `shatter`, `push`, `glitch`, `cube`, `pageTurn` and `magicMove` play a fade.

## `registry`

`registry` maps each transition name (`cut`, `fade`, `blackout`, `zoom`, `shatter`, `crt`, `push`, `iris`, `glitch`, `cube`, `pageTurn`, `magicMove`) to its function `(from, to, opts) => timeline`. `from` and `to` are the old and new canvas; the timeline ends with `from` hidden and `to` shown. A timeline with a label `reveal` lets the new section's first step start there.

## `playTransition`

`playTransition(kind, from, to, opts)` runs `registry[kind]` and returns `{ kind, tl }`. A transition that throws logs `transition '<kind>': <error>; playing fade` and plays `fade`, so the move still lands.

## `loadTransitions`

`loadTransitions(kinds)` loads the code of `zoom`, `shatter`, `crt`, `glitch`, `cube`, `pageTurn` and `magicMove` for the kinds given; the others are always there. The engine awaits it at start with the kinds the deck's `section.ts` files name, so a deck that never asks for a shatter does not fetch it. A lazy kind that was not loaded throws `<kind>: not loaded`, and `playTransition` plays `fade`.

## `transitionZoom`

Catalog: section `170-zoom`. The old canvas dives into a ref (`zoomTarget`, an element or a world rect on the old canvas, else the frame centre), then the new canvas grows in from that point. Sets `reveal`, so the new step starts while it grows. From `decks/demo/sections/170-zoom/section.ts`:

```ts
const section: SectionModule = { transition: "zoom", zoomTarget: "countsAim" };
```

A `zoomTarget` that names no ref logs `zoom: no ref '<name>' on the old canvas; diving into the frame centre`.

## `transitionShatter`

Catalog: section `150-map` and `200-shatter`. The old frame cracks and falls in shards over black, then cuts to the new canvas. `transitionOptions` takes `shards`, `seed`, `fall` and `toViewer` as for `shatter`. From `decks/demo/sections/150-map/section.ts`:

```ts
const section: SectionModule = { transition: "shatter", transitionOptions: { shards: 20, seed: 3 } };
```

## `transitionCrt`

Catalog: section `140-icons` and `210-shout`. The old canvas collapses to a bright line and a dot, then a line flashes across and opens into the new canvas. `transitionOptions: { color: "amber" }` uses the amber phosphor; the default is green. `flash: "full"` opens the new canvas brighter (see [crt](elements/crt.md)).

## `push` and `iris`

Catalog: section `266-focus` (`push`) and `296-cycles` (`iris`). `push`: the new canvas pushes the old one off the frame in 0.7 s. `transitionOptions: { direction: "up" }` sets the way the old canvas leaves: `left` (default), `right`, `up` or `down`. `iris`: a circle opens the new canvas from a point in 0.8 s; the old canvas shows only outside the circle. `transitionOptions: { origin: [300, 200] }` sets the centre of the circle in frame pixels (1920 x 1080); the default is the centre of the frame. A wrong `direction` or `origin` logs the error and plays `fade`. Both set `reveal` at their start: the first step of the new section plays while the canvas moves or opens in. With reduced motion `push` plays a fade; `iris` stays, as it moves no content. From `decks/demo/sections/266-focus/section.ts`:

```ts
const section: SectionModule = { transition: "push" };
```

## `pushOffset`

`pushOffset(direction = "left")` returns `{ x, y }` in frame pixels: where the old canvas ends for a push, for example `{ x: -1920, y: 0 }` for `left`. The new canvas starts at the opposite offset. It throws on any other direction.

## `irisRadius`

`irisRadius(x, y)` returns the radius in pixels that covers the 1920 x 1080 frame from `(x, y)`: the distance to the farthest corner.

## `irisHole`

`irisHole(x, y, r)` returns the `clip-path` for the old canvas during an iris: the frame minus a circle of radius `r` at `(x, y)`, as an even-odd `path()`. The canvases are transparent, so without the hole the old canvas would show through the circle.

## `transitionGlitch`

Catalog: section `297-venn-pyramid`. A short digital break-up, 0.5 s, for the bold theme. Both canvases show in horizontal bands that jump sideways, with a colour split in the theme's two accents (`--k-accent`, `--k-accent-2`); the bands turn from old to new. A band of the new canvas shows it as it is before its first step. The pattern is seeded: `transitionOptions: { seed: 3 }` picks another. From `decks/demo/sections/297-venn-pyramid/section.ts`:

```ts
const section: SectionModule = { transition: "glitch" };
```

## `glitchFrame`

`glitchFrame(p, seed = 1)` gives the glitch at progress `p` (0 to 1): `bands` (`{ y, h, fresh }`, which tile the 1080 px frame; a `fresh` band shows the new canvas), `dx` (the sideways offset of the old and the new canvas, px) and `split` (the colour split, px). It is pure, so a seek shows the same frame as play. The first frame is all old, the last all new, and each frame between shows both.

## `transitionCube`

Catalog: section `298-table-card`. The old canvas turns away to the left as one face of a cube, and the new canvas turns in as the next face, over the stage colour (`--k-bg`), in 1 s. Sets `reveal` at 60 %, so the new step starts while the face lands. From `decks/demo/sections/298-table-card/section.ts`:

```ts
const section: SectionModule = { transition: "cube" };
```

## `transitionPageTurn`

Catalog: section `299-notes-cards`. The old canvas peels off like a page from its bottom-right corner, in 0.9 s. The back of the page, in `--k-surface` with a light shade at the crease and toward the folded corner, folds over it, and the new canvas comes out of the page's shadow. Sets `reveal` at 60 %. From `decks/demo/sections/299-notes-cards/section.ts`:

```ts
const section: SectionModule = { transition: "pageTurn" };
```

## `pagePeel`

`pagePeel(p)` gives the peel at progress `p` (0 to 1) as two polygons in frame pixels: `page`, the part of the old canvas that still lies flat, and `flap`, the peeled part folded back over it. The fold runs from the bottom-right corner to the top-left one. It is pure; `transitionPageTurn` draws it as clip paths.

## `transitionMagicMove`

Catalog: sections `301-magic-a` and `302-magic-b` (`#/magic-b/after/1`). An element that both sections show with the same `data-k-match` key flies from its old place to its new one in 0.9 s. Meanwhile the old canvas fades out, then the new one fades in, over the 0.9 s flight. On the way its old look fades into its new look, each scaled uniformly (as in `morph`), so text never stretches. Set the key in the scene's `build`: `el.dataset.kMatch = "plan"` on an HTML element, `tile.el.dataset.kMatch = "rocket"` on an icon or any SVG shape. A Markdown scene cannot set it.

A key counts when its element shows in the frame on both sides: on the old canvas as it stands, on the new canvas as its first step leaves it. With the same key twice on one side, the first in document order flies. The flying copies sit in a layer above both canvases; the real elements are hidden meanwhile by an attribute (`data-k-fly-hide`), never by inline styles, so the steps keep them. Sets `reveal` when the flight lands: the first step plays under the landed copy, which leaves when that step ends. A key press ends it at once, and nothing stays behind. With no shared key it plays a fade; with reduced motion too. From `decks/demo/sections/302-magic-b/section.ts`:

```ts
const section: SectionModule = { transition: "magicMove" };
```

Limits: the copy carries the computed styles of each node inline, which suits a chip, a title or an icon, not a large subtree. A step that moves the element after the first step is not followed. Rotation is not carried. The new section's first step is run once, out of sight, to measure it: its `onUpdate` and `.call()` callbacks fire then too.

## `magicBox`

`magicBox(rect, stage)` turns a screen rect (`{ left, top, width, height }`) into stage pixels `{ x, y, w, h }`: it removes the stage's offset and undoes the scale that fits the 1920 x 1080 stage to the window.

## `magicFit`

`magicFit(box, base)` gives the pose `{ x, y, scale }` (origin top left) of a copy of size `base` (`{ w, h }`) scaled uniformly to fit inside `box`, centred on it. An empty `base` keeps scale 1. The old look ends inside the new box and the new look starts inside the old one.
