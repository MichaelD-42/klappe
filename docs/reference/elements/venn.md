# Venn: `venn`

Two or three overlapping circles with names. Each step lights one region: a single circle's own part or an overlap. The region before it settles as it lights.

Catalog: section `297-venn-pyramid` (`#/venn-pyramid/overlaps/1`).

## `venn`

Only in `scene.ts`. Shortened from `decks/demo/sections/297-venn-pyramid/10-overlaps/scene.ts`:

```ts
import { venn, type VennHandle } from "klappe/fx";

build: (ctx) => ({
  v: venn(ctx, {
    x: 160, y: 270, w: 1600, h: 670,
    sets: [{ id: "design", label: "Design" }, { id: "code", label: "Code" }, { id: "data", label: "Data" }],
    regions: { design: "Taste", "design+code": "Prototypes", "design+code+data": "Products" },
  }),
}),
steps: [
  (tl, r: { v: VennHandle }) => r.v.show(tl),
  (tl, r) => r.v.light("design")(tl),
  (tl, r) => r.v.light("design", "code")(tl),
  (tl, r) => r.v.light("design", "code", "data")(tl),
],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `x`, `y`, `w`, `h` | numbers | required | the area; a 48 px band at its top and bottom holds the set names, the circles fill the rest |
| `sets` | `{ id, label }[]` | required | two or three sets. Two sit side by side; three sit two above and one below. Centres are one radius apart. Each name is 26 px bold in `--k-fg`, above a circle in the upper row and below one in the lower row |
| `regions` | `Record<string, string>` | none | a label per region, 22 px in `--k-fg`, keyed by the region's set ids joined with `+` in any order (`"design+code"`). It sits in the region and fades in when the region first lights, then stays |

### Step adders

| Handle | Step |
| --- | --- |
| `show` | a step adder itself (`r.v.show(tl)`): the circle outlines (4 px `--k-line`) draw on with `drawOn`, then the names fade in |
| `light(...ids)` | lights the region in exactly those sets and in none of the others: `light("design")` is the part of Design outside Code and Data; `light("design", "code", "data")` is the middle. The region fills with `--k-accent` at `MARKER_MIX` (35 %) over the background, clipped to the region by SVG clip paths, so it is exact. The region lit before it fades out as it fades in (0.6 s): settled means unlit. Lighting the lit region again holds. An unknown id throws `venn: unknown set "<id>"` |

### Reduced motion

With `?reducedmotion=1` (or the viewer's setting) the outlines fade in instead of drawing on. Region fills and labels fade either way.

### Limits

- `sets` must have 2 or 3 entries with distinct ids; otherwise `venn` throws.
- An id that is not a set throws `venn: unknown set "<id>"`: in a `regions` key when the venn is built, in `light()` when the step is made. `light()` with no ids throws `venn: a region needs a set`.
- Names and region labels are not fitted. Keep them to a word or two: a pair region in a three-set venn is about 0.6 × the radius wide (155 px in the catalog).

## `vennLayout`

`vennLayout({ x, y, w, h }, n)` gives `{ circles, names, regions }`: the circles (`{ x, y, r }`), each name's anchor and whether it sits above its circle, and a label point per region keyed by its set indexes (`"0+1"`). It is what `venn` draws; tests use it to check that each label point lies in exactly its region.
