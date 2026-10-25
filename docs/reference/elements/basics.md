# Basics: `show`, `hide`, `title`, `text`

The plain building blocks of a `scene.ts` scene: a title, text boxes, and fades in and out of any element.

Catalog: section `106-basics` (`#/basics/text-and-fades/2`).

## Example

Only in `scene.ts`. Shortened from `decks/demo/sections/106-basics/10-text-and-fades/scene.ts`:

```ts
import { hide, show, text, title } from "klappe/fx";

build: (ctx) => ({
  h: title(ctx),
  a: text(ctx, { text: "A text box", x: 160, y: 360, w: 1500 }),
  b: text(ctx, { text: "Muted", x: 160, y: 520, w: 740, size: 36, color: "--k-muted" }),
}),
steps: [
  (tl, r) => (r.h.show(tl), r.a.show(tl)),
  (tl, r) => show(r.b.el)(tl),
  (tl, r) => hide(r.a.el)(tl),
],
```

## `show` and `hide`

`show(el, opts?)` and `hide(el, opts?)` return a step adder that fades `el` (an element or a list) in or out with `autoAlpha`. Hidden also means `visibility: hidden`, so a hidden element takes no clicks.

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `duration` | number | 0.6 | seconds of the fade |

`show` does not hide anything first: build the element hidden. `title` and `text` do this for you; for your own element, call `gsap.set(el, { autoAlpha: 0 })` in `build`. A `show` that hid the element when the adder is made would act outside the timeline, so a seek and a play could differ.

## `title`

`title(ctx, text?)` builds the scene title, hidden, as an `h2` in `ctx.html`: the same place and style as a Markdown scene's title. `text` defaults to the `scene.md` title (`ctx.doc.title`). With no text and no `scene.md` title, it reports `title: no text and no scene.md title`. A scene with `build()` gets no title from klappe, so call this one.

## `text`

`text(ctx, opts)` builds a text box, hidden, at a scene-local position.

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `text` | string | required | the text |
| `x`, `y` | number | required | top-left corner, scene units |
| `w` | number | required | the width the text wraps at |
| `size` | number | 44 | font size in scene px, as a Markdown scene's text |
| `color` | string | `"--k-fg"` | a theme token name, for example `"--k-muted"` or `"--k-accent"` |
| `weight` | number | 400 | font weight |

A `color` that is not a `--k-*` name (for example `"red"`) reports `text: color "red" is not a --k-* token name` and the box uses `--k-fg`. So does a `--k-*` name the theme does not define (for example `"--k-nope"`), with `text: unknown token "--k-nope"`.

## Handle

`title` and `text` return a `BasicHandle`: `{ el, show }`. `el` is the element, `show` is the step adder `show(el)`. To hide it again, call `hide(r.h.el)(tl)`.

## Reduced motion

Unchanged: `show` and `hide` are fades, with no movement.
