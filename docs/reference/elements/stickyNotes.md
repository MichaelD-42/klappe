# Sticky notes: `stickyNotes`

Notes for a workshop deck: they appear scattered and slightly tilted, as the room stuck them up, then fly into labelled group columns one group per step (an affinity map). Each note is a paper colour: a `--k-series-N` token mixed toward `--k-bg`, with `--k-fg` text.

Catalog: section `299-notes-cards` (`#/notes-cards/affinity/1`).

## `stickyNotes`

Only in `scene.ts`. Shortened from `decks/demo/sections/299-notes-cards/10-affinity/scene.ts`:

```ts
import { stickyNotes, type StickyNotesHandle } from "klappe/fx";

build: (ctx) => ({
  n: stickyNotes(ctx, {
    x: 160, y: 270, w: 1600, h: 670,
    notes: [{ id: "setup", text: "Setup took a day" }, { id: "cli", text: "Love the CLI" }],
    groups: [{ id: "start", label: "Getting started" }, { id: "like", label: "What we like" }],
  }),
}),
steps: [
  (tl, r: { n: StickyNotesHandle }) => r.n.show()(tl),
  (tl, r) => r.n.group("start", ["setup"])(tl),
  (tl, r) => r.n.group("like", ["cli"])(tl),
],
```

Call `stickyNotes` in `build`; the steps only use what it returns.

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `x`, `y`, `w`, `h` | numbers | required | the area. With groups, the top 56 px hold the group labels and the columns split the width, 32 px apart |
| `notes` | `{ id, text }[]` | required | the notes, all built hidden. Note `i` takes `--k-series-((i % 6) + 1)` at 30 % over `--k-bg` (`NOTE_MIX`); `--k-fg` on it holds 5.9:1 or more in every built-in theme |
| `groups` | `{ id, label }[]` | none | the group columns, left to right. A label is one line, 26 px bold, over a 3 px underline |
| `seed` | number | `1` | picks the scatter. The same seed gives the same places and tilts |

### Step adders

| Handle | Step |
| --- | --- |
| `show(ids?)` | returns a step adder (`r.n.show()(tl)`). The notes in `ids` (all when left out) pop in at their scattered place, tilted up to 4°, 0.08 s apart. Notes already out are skipped. With reduced motion they fade in, without the pop |
| `group(groupId, ids)` | returns a step adder. The group's label fades in the first time; its underline is `--k-accent` during the step and settles to `--k-line` when the next `group` starts. Each note in `ids` flies to the first free slot of the column, filled row by row from the top, and stands upright, 0.6 s, 0.08 s apart, over the notes still scattered. A column's notes sit centred in the height under its label. The notes still scattered move out of the column, spread evenly over the columns of groups not formed yet. A note never shown fades in at its slot. A note already in this group stays put; one in another group moves. With reduced motion a shown note cuts to its slot. An unknown note throws `stickyNotes: unknown note "<id>"`, an unknown group `stickyNotes: unknown group "<id>"` |

### Limits

- The note size follows the columns: two columns of notes per group when the group is 376 px wide or more, notes 180 to 240 px wide and 0.7 as high. Without groups, notes are 240 × 168.
- Scattered notes sit below the label band, spread evenly: as few rows as hold them, each row's notes across the width, each with a seeded nudge and lean, one note per cell, so they do not overlap. Once a group forms they keep out of its column. More notes than cells overlap; give them a bigger area. Notes left scattered after every group formed stay where they are and may overlap a column.
- Each column has a fixed number of slots, filled row by row: 6 per group at the catalog's 1600 × 670 with three groups. One more shows `stickyNotes: group "<id>" is full` and puts the note on the last slot.
- Notes that leave a group leave a gap; the next note grouped there fills it.
- Note text wraps and shrinks from 22 px to the 20 px floor. Text that still does not fit shows `stickyNotes: text of "<id>" too long`. Fitting happens when the first step is added. Group labels are not fitted: they cut with an ellipsis.

## `stickyLayout`

`stickyLayout({ x, y, w, h }, n, groups, seed?)` gives `{ note, scatter, labels, columns, slots, cols }`: the note size, each note's scattered pose `{ x, y, rotation }`, each group's label rect, each group's column rect under its label, each group's slot rects in fill order and the slots per row. It is what `stickyNotes` draws; tests use it to check that notes stay in the area and do not overlap.

## `scatterIn`

`scatterIn(areas, idx, note, seed?)` spreads the notes with indices `idx` evenly over the `areas` (rects) and gives their poses `{ x, y, rotation }` in `idx` order. Each area takes a share by its room. `stickyNotes` uses it for the first scatter and to spread the notes left over the columns still free; tests use it to check the notes stay inside and apart.

## `NOTE_MIX`

`0.3`: the share of the series colour in a note. The unit test checks `--k-fg` on every note colour in every built-in theme with it.
