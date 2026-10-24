# Effects

The M2 effects of `klappe/fx`. Each is a function you call in `build(ctx)` of a `scene.ts`. It builds its DOM hidden and returns a handle; the handle's methods are step adders that only add tweens. Rects and positions are scene-local, in 1920x1080 units. Colours are `var(--k-*)` tokens, see [themes](themes.md). The ten newer elements have their own pages in `elements/`; hand-written tweens are in [motion](motion.md).

Every example below is a scene from the demo deck's catalog (the sections after the story, from `110-chart` on), trimmed to the call and its steps. Run it with `npm run dev`.

## `chart`

Catalog: section `110-chart` (`#/chart/bars/1`). A bar, stacked, line, waterfall or timeline chart from a `data/` file. In Markdown, a list item linking to `data/x.csv` or `data/x.json` makes a bar chart (see [markdown](markdown.md)).

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
| `type` | `"bar"`, `"stacked"`, `"line"`, `"waterfall"`, `"timeline"` | `"bar"` | the chart form. `bar` and `waterfall` use the first number column; `stacked` and `line` use all; `timeline` reads two (start, end) per row |
| `rect` | `{ x, y, w, h }` | required | where the chart sits |
| `title` | string | none | shown above the plot |
| `data` | `Row[]` or `null` | read `src` from `ctx.files.data` | rows you parsed yourself; `null` says the file is missing |
| `sample` | boolean | false | show the "Sample data" label. It also shows when the file has the line `# source: klappe demo sample` |

The first column labels the rows; every later column with a number in any row is a series and must be a number in every row.

### Step adders

| Handle | Step |
| --- | --- |
| `axes` | title, legend and axes fade in |
| `grow` | bars, segments, lines or waterfall steps grow in, staggered |
| `values` | the value labels fade in and count up |

### Limits

- A missing file, an empty file or bad data shows a large box (DATA MISSING or DATA ERROR with the reason) and a deck problem, `chart: <label>: <src> (<why>)`. It never plots around a bad cell.
- Text is 22 scene units (15.6 px at 1366). A `# source:` comment line in the CSV goes to the speaker notes.

## `parseCsv`

`parseCsv(text)` reads a CSV string into rows (`Record<string, string | number>[]`): the first non-comment line is the header, a cell that is a finite number becomes a number. Lines starting with `#` are comments; `# source: <origin>` before the header rides on the result as `.source`. Quoted commas are not supported. Use it to read a `data/` file for an effect that is not a chart:

```ts
build: (ctx) => ({ rows: parseCsv(ctx.files.data["data/units.csv"] ?? "") }),
```

## `dataError`

`dataError(rows, type)` returns why the rows cannot be drawn as that chart type (`"row 3, Q2 not a number"`, `"needs a start and an end column"`, `"row 2, end before start"`), or `""`. `chart` calls it; call it yourself to check data before you pass it as `data`.

## `waterfallSteps`

`waterfallSteps(deltas)` gives each delta's bar as `[from, to]`: the running total before it and after it. `waterfallSteps([5, -2])` is `[[0, 5], [5, 3]]`.

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
| `sites` | `{ id, label, lon, lat }[]` | required | places; a site without a finite `lon` and `lat` is a deck problem and left out |
| `arcs` | `{ from, to }[]` | none | arcs created at load; `arc` then only draws them |

### Step adders

| Handle | Step |
| --- | --- |
| `draw` | the land draws on (2.4 s) |
| `site(tl, id)` | the site's dot pops in |
| `arc(tl, from, to)` | the arc draws on. An arc not in `arcs` is created on the spot; declare arcs to keep step functions tween-only |
| `zoomTo(tl, id)` | the camera flies to the site; only that site's label shows; strokes thin to keep their weight |
| `world` | labels fade out, the camera frames the whole scene again |

### Limits

- Labels are 8 map units, which reads only at the `zoomTo` zoom (22.8 px at 1366); at world zoom they are hidden.
- An unknown site id is a deck problem (`worldMap: unknown site '<id>'`).

## `fitProjection`

`fitProjection(rect)` gives the d3 projection `worldMap` uses, with the globe fitted into `rect`. `fitProjection(rect)([lon, lat])` is the `[x, y]` of a place, for your own marks on the map.

## `arcPath`

`arcPath([ax, ay], [bx, by])` gives the SVG path data of the arc `worldMap` draws: a quadratic curve that bows upward by a quarter of its length.

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

### Step adders

| Handle | Step |
| --- | --- |
| `appear` | fades in (0.5 s) |
| `walk(tl, path, { duration, at? })` | the feet follow `path`, a path string or an SVG path element you drew (`decks/demo/sections/130-figure/20-path`); the limbs swing as a pure function of progress |
| `gather(tl, x, y, at?, duration?)` | walks in a straight line to `(x, y)`; `duration` defaults to 1.2 s |

### Limits

The path must be in the figure's coordinate space (`ctx.svg`, scene-local); a path under a transformed ancestor lands elsewhere.

## `limbAngle`

`limbAngle(progress, steps, swing = 25)` gives the limb angle in degrees at walk progress `progress` for `steps` strides: `swing * sin(progress * steps * 2π)`. Zero at progress 0 and 1, so a walk starts and ends upright. It is what `figure` writes from `onUpdate`.

## `lineArt`

Catalog: section `120-draw` (`#/draw/desk/1`). A line drawing from an SVG file, drawn stroke by stroke, with one part that can glow. It is for trusted, author-supplied SVG only: it strips scripts, styles and handlers, but is not a sanitizer.

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
| `glow(tl, selector)` | the matching parts turn amber (`--k-phosphor-amber`) and glow; no match is the deck problem `lineArt glow: nothing matches '<selector>'` |

### Limits

A source that is not an SVG with a viewBox shows `lineArt: the source is not an SVG with a viewBox`. Strokes take `--k-fg`, round caps and joins; an exporter's own fill and stroke colours are replaced.

## `drawOn`

Catalog: section `120-draw` (`#/draw/shapes/1`). Draws any stroked SVG shapes from start to end, one after another, and ends on a plain stroke. It returns a step adder: call it with the timeline.

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

`icon(ctx, name, { x, y, size?, color })`: `name` is a Lucide name in kebab case (`"shield-check"`); `x`, `y` is the centre; `size` defaults to 96; `color` is required. An unknown name draws a crossed box and reports `icon: unknown Lucide name '<name>'`.

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

`iconTile(ctx, name, { x, y, size?, tone })`: `tone` is a theme token, `"accent"`, `"phosphor"`, `"phosphor-amber"` or a full `"--k-accent"`; an unknown tone falls back to accent with the problem `iconTile: unknown tone '<tone>'`. `size` defaults to 96; the glyph is 60% of it. `draw` and `light` are as for `icon`.

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
| `scrim` | number 0 to 1 | none | a dark layer over the picture; use 0.6 or more for text on top |

### Step adders

| Handle | Step |
| --- | --- |
| `show(tl, at?)` | fades the picture in. A full-frame picture (`cover`, no `rect`) starts with the step and fades in over the camera flight, slowly at first. With `kenBurns` the step lasts `KEN_BURNS` seconds |
| `hide(tl, at?)` | fades it out quickly |
| `move(tl, { duration }, at?)` | the push on its own, for `show`, `move`, `hide` on three steps (`decks/demo/sections/230-fullscreen/50-steps`). Do not set `kenBurns` and also call `move`: the push would start twice |

### Limits

- A missing file shows IMAGE MISSING over the picture's area and a deck problem; a `cover` image with alt text also shows a prompt for an image generator. `klappe test` writes it to `media/TODO.md`.
- For a sharp push at 1920 wide use a source of at least about 2080x1170 px.
- A background for a whole section is `background: { href, alt, scrim, kenBurns }` in `section.ts`, see [deck format](deck-format.md).

## `KEN_BURNS`

`KEN_BURNS` is 6, the seconds of the default push. `show()` with `kenBurns` makes its step this long.

## `video`

Catalog: section `190-media` (`#/media/youtube/1`). A video in a framed box with its title as a caption. In Markdown, a list item linking to YouTube, Vimeo, or a `.mp4` or `.webm` file shows one.

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
| `title` | string | required | the caption under the box |
| `rect` | `{ x, y, w, h }` | required | the area; the box is the largest 16:9 (later the clip's own ratio) inside it |

`show(tl)` fades the box in. A local file plays when its step arrives and pauses when the viewer leaves; an embedded player is started by the viewer, and a click into it hands the keyboard back to klappe. A missing local file shows VIDEO MISSING and a deck problem. An online link needs the network, which the speaker notes say.

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

Catalog: section `210-shout` (`#/shout/calm/1`). A shout-out: the room dims, a big question holds, then the answer lands. In Markdown, `### Question?` and a paragraph make the same four steps with the deck's `intensity`.

From `decks/demo/sections/210-shout/20-bold/scene.ts`:

```ts
import { shout, type ShoutHandle } from "klappe/fx";

build: (ctx) => shout(ctx, { question: "Who owns the release?", answer: "The team that ships it.", intensity: "bold" }),
steps: [
  (tl, s: ShoutHandle) => s.enter(tl),
  (tl, s: ShoutHandle) => s.hold(tl),
  (tl, s: ShoutHandle) => s.fade(tl),
  (tl, s: ShoutHandle) => s.answer(tl),
],
```

| Name | Type | Meaning |
| --- | --- | --- |
| `question` | string | the big text; long text gets a smaller size to stay in the frame |
| `answer` | string | shown in `--k-accent` at 70% of the question's size |
| `intensity` | `"calm"` or `"bold"` | required. Calm dims 30% and eases in; bold dims 70%, adds a vignette, enters hard, pushes in more, keeps a trace of the question after the fade and pops the answer |

| Handle | Step |
| --- | --- |
| `enter` | the dim and question come in (an earlier shout's answer leaves) |
| `hold` | the question pushes in slowly (2 s calm, 2.5 s bold) |
| `fade` | the question fades |
| `answer` | the dim lifts and the answer builds in |

Text is set with `textContent`, never as HTML. The four steps must be four entries in `steps` (or four Markdown steps).

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

`morph(ctx, { from, to })` takes two elements, HTML or SVG (`60-motion/20-shape-morph`). `play(tl)` moves `from` onto `to` over 1.2 s (`power2.inOut`) and crossfades over the middle 70%. Both scale by one factor (the geometric mean of the size ratios), so text is never stretched; a transform you set yourself is kept. `to` is hidden until `play`. Build `morph` after both elements are in place: positions are measured when the step is added.

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

`counter(ctx, { x, y, from, to, label })` is centred on `(x, y)`; the number is 144 px in `--k-accent`, the label 36 px. `run(tl)` fades it in and counts over 1.8 s, written from `onUpdate` as a pure function of progress. Numbers use English thousands separators.

## `counterText`

`counterText(from, to, p)` gives the counter's text at progress `p`: `round(from + (to - from) * p)` with thousands separators. `counterText(0, 2000, 0.5)` is `"1,000"`.

## Transitions

Set in `section.ts` with `transition` (see [deck format](deck-format.md)); the catalog sections show each one. You rarely call these functions yourself.

## `registry`

`registry` maps each transition name (`cut`, `fade`, `blackout`, `zoom`, `shatter`, `crt`) to its function `(from, to, opts) => timeline`. `from` and `to` are the old and new canvas; the timeline ends with `from` hidden and `to` shown. A timeline with a label `reveal` lets the new section's first step start there.

## `playTransition`

`playTransition(kind, from, to, opts)` runs `registry[kind]` and returns `{ kind, tl }`. A transition that throws logs `transition '<kind>': <error>; playing fade` and plays `fade`, so the move still lands.

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

Catalog: section `140-icons` and `210-shout`. The old canvas collapses to a bright line and a dot, then a line flashes across and opens into the new canvas. `transitionOptions: { color: "amber" }` uses the amber phosphor; the default is green.
