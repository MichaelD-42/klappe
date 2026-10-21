# Checklist: `checklist`

A list of square boxes. Each step ticks the next box: the check draws on in `--k-ok` and the item text brightens from `--k-muted` to `--k-fg`.

Gallery: section `210-checklist-agenda` (`#/checklist-agenda/checklist/1`).

## Markdown

Task items in `scene.md`. The first step shows the list; each item is one step that ticks it. `[x]` items are ticked when the list shows. From `decks/gallery/sections/210-checklist-agenda/10-checklist/scene.md`:

```md
- [x] Backup verified
- [ ] Restore tested
- [ ] Owners told
```

## `checklist`

In `scene.ts`: `checklist(ctx, { items, x, y, w, h })` returns `{ show, tick(i) }`.

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `items` | `{ text, done? }[]` | required | the rows; `done: true` is ticked from `show` |
| `x`, `y`, `w` | number | required | the list's top-left corner and width, scene units |
| `h` | number | none | the height the list must fit |

### Step adders

| Handle | Step |
| --- | --- |
| `show` | fades the list in and draws the checks of `done` items |
| `tick(i)` | draws item `i`'s check, brightens its text; the box is lit in `--k-accent` until the next tick. On a `done` item the check is not drawn again (`show` drew it); only the box highlight and text change |

### Limits

- Text is 40 px and shrinks to 20 px (14 px at 1366) to fit `h`. If it still does not fit, the deck shows `checklist: N items do not fit Hpx at 20px text` and nothing draws. The Markdown form passes the scene's list area as `h`.
- `tick(i)` of an item that is not there shows `checklist: no item i`.
- Long items wrap.
