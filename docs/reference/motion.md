# Motion and tweens

How a step moves things, and how to write your own tween when no effect fits. The effects themselves are in [effects](effects.md) and `elements/`.

## The timeline rule

Each canvas has one master GSAP timeline. The engine owns it. Playing a step and seeking to it must give the same picture, because the viewer jumps by seeking (deep links, Home, End, back). So:

- All DOM exists at load. `build(ctx)` creates it, hidden with `gsap.set(el, { autoAlpha: 0 })`. A step never creates or removes elements.
- A step function only adds tweens to `tl`. It does not change the DOM or call anything with side effects.
- Use `tl.fromTo`, not `tl.from`. A `from` tween reads the element's state while the timeline is built, and a seek back then lands somewhere else.
- Give every `fromTo` `immediateRender: false`, and set its start value in `build()` with `gsap.set`. Otherwise GSAP applies the start value when the timeline is built, so a later step's start value shows at load. A `tl.set` in a step is fine only on a value `build()` already set.
- A callback may write the DOM only as a pure function of a tween's progress: `onUpdate` that sets text or a canvas from `this.progress()`. Mark that element `data-k-text` (text) or `data-k-progress` (a progress value), so the self-test compares it. `counter` and `crt` do this.
- Position `"<"` is fine after a tween this step added. Never start a step with `"<"` or `"-="`: a step starts at its own label, and an offset before it can pull the tween into the previous step. A step that does this shows a deck problem.
- Camera moves inside a scene are `ctx.camera.to(tl, rect, { duration, at })`, after the scene's entry. To ride along with a moving element or jolt the scene on a landing, use `follow` and `impactShake` ([camera](elements/camera.md)).

## Step functions

`steps` in `scene.ts` is an array with one function or `null` per step, in the order of the list items in `scene.md`. A function is `(tl, refs, ctx) => void`. `refs` is what `build` returned. `null` is the default step, which shows the step's text. Effect handles give step adders with the same shape, `(tl) => void`, so you call them from a step: `(tl, r) => r.chart.grow(tl)`. If the number of steps in `scene.ts` and `scene.md` disagree, the walk fails.

## Move, rotate, resize and scale

When no effect fits, add a tween with `tl.to(element, vars)`. Position the element with CSS in `build`; the tween only changes the properties you name.

| Intent | Property | Example |
| --- | --- | --- |
| move | `x`, `y` (px, relative to where it sits) | `tl.to(box, { y: 260, duration: 1.2, ease: "power2.inOut" })` |
| rotate | `rotation` (degrees) | `tl.to(box, { rotation: 45, duration: 1.2, ease: "back.out(1.7)" })` |
| resize | `width`, `height` | `tl.to(box, { width: 320, height: 320, duration: 1.2, ease: "elastic.out(1, 0.4)" })` |
| scale | `scale`, `scaleX`, `scaleY` | `tl.to(box, { scale: 1.5, duration: 0.6 })` |
| show, hide | `autoAlpha` (opacity and visibility) | `tl.to(box, { autoAlpha: 1, duration: 0.6 })` |

`width` and `height` move the layout (text reflows); `scale` is cheaper and keeps the box's shape, but stretches text. For a text-safe grow, use `scale` on the box with one factor for both axes. The default duration is 0.6 s (`motion.step`); a camera flight is 1.6 s.

Catalog: section `330-tweens` (`#/tweens/boxes/1`). Three boxes, the same moves, a different ease each. From `decks/demo/sections/330-tweens/10-boxes/scene.ts`:

```ts
const EASES = ["power2.inOut", "back.out(1.7)", "elastic.out(1, 0.4)"];

steps: [
  (tl, r) => {
    tl.to([...r.labels, ...r.boxes], { autoAlpha: 1, duration: 0.6 });
    r.boxes.forEach((b, i) => tl.to(b, { y: 260, duration: 1.2, ease: EASES[i] }, i ? "<" : ">"));
  },
  (tl, r) => r.boxes.forEach((b, i) => tl.to(b, { rotation: 45, duration: 1.2, ease: EASES[i] }, i ? "<" : undefined)),
  (tl, r) => r.boxes.forEach((b, i) => tl.to(b, { width: 320, height: 320, duration: 1.2, ease: EASES[i] }, i ? "<" : undefined)),
],
```

Colours are `var(--k-*)` tokens, never literals. Text stays at 20 scene px or more.

## Eases

Name an ease as a string: `ease: "power2.inOut"`. Each has `.in`, `.out` and `.inOut`.

| Ease | Feel |
| --- | --- |
| `none` | constant speed; for progress-driven text and walks |
| `power1`, `power2`, `power3`, `power4` | rising strength of acceleration; `power2.inOut` is the quiet default for moving things |
| `sine` | very gentle; `sine.inOut` for slow pushes (the Ken Burns push) |
| `back` | overshoots and settles; `back.out(1.7)`, the number is the overshoot, larger is more. For pop-ins |
| `elastic` | springs past the target and wobbles; `elastic.out(1, 0.4)`, amplitude then period (smaller period, tighter wobble). Rarely: it reads as playful |

Use `out` for things that arrive, `in` for things that leave, `inOut` for things that cross the frame. Overshoot (`back`, `elastic`) can cross a neighbour or the caption strip at the bottom of the frame: leave room for it.

## Positions

The third argument of `tl.to` places the tween: omitted is the end of the timeline, `"<"` is the start of the previous tween, `">"` its end, `"+=0.2"` a gap after the end. In a step, use only these relative forms, and not `"<"` or `"-="` first.
