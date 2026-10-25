# UI walkthrough: `pointer`

A mouse pointer that walks through a screen: it moves to a target on a slight curve, clicks with a ripple and types into a field. For tool trainings over a screenshot or a screen drawn in the scene. `loupe` and `spotlight` point at a place; `pointer` shows the action.

Catalog: section `239-pointer` (`#/pointer/sign-in/2`).

## `pointer`

Only in `scene.ts`. From `decks/demo/sections/239-pointer/10-sign-in/scene.ts`:

```ts
import { pointer, type PointerHandle } from "klappe/fx";

build: (ctx) => ({ p: pointer(ctx, { at: { x: 1500, y: 760 } }), form: signInForm(ctx, 600, 200) }),
steps: [
  (tl, r) => r.p.show(tl),
  (tl, r) => (r.p.move(r.form.email)(tl), r.p.click(tl), r.p.type(r.form.email, "ada@example.com")(tl)),
  (tl, r) => (r.p.move(r.form.button)(tl), r.p.click(tl)),
],
```

On a screenshot, aim at points on the picture in scene units: `r.p.move({ x: 820, y: 430 })(tl)`, and type into a rect: `r.p.type({ x: 700, y: 400, w: 500, h: 60 }, "text")(tl)`.

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `at` | `{ x, y }` | required | where the pointer's tip shows, scene units |

The pointer is the classic arrow in `--k-fg` with a `--k-bg` outline, above the scene's text. Its tip is the point.

### Step adders

`show`, `hide` and `click` are step adders themselves: `r.p.click(tl)`. `move` and `type` return one.

| Handle | Step |
| --- | --- |
| `show`, `hide` | the pointer fades in or out where it is |
| `move(target, { duration? })` | the tip moves to `target`, an element (its centre, measured when the step is added) or a point, in 0.8 s by default; x and y ease differently, so the path bows |
| `click` | the pointer presses in and back, and a ring in `--k-accent` grows out of the tip and fades |
| `type(field, text)` | the field, an element or a rect, gets a `--k-surface` patch with a `--k-accent` border (focused), and `text` types into it at 14 characters a second with a caret; the field typed into before loses its accent border. Text is half the field's height, at least 20 px |
| `el` | the pointer's element. Not a step |

Each step starts where the steps before left the pointer, so add them in order.

### Limits

- The typed text sits on its own patch, so it reads on any picture; the patch hides what the screenshot shows in the field.
- A target with no size shows `pointer: move target has no size to measure` or `pointer: type field has no size to measure`; a field too low for 20 px text shows `pointer: field <h> px high is too low for 20 px text`.
- No scrolling, dragging or hover states: draw those with your own tweens.
