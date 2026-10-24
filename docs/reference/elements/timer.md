# Timer: `timer`

A countdown for an exercise in a training. It counts real minutes on the wall clock, not timeline time: the one element where seek does not equal play. In the last 20% it turns `--k-warn`; at zero it turns `--k-bad` and shows "Time's up".

Catalog: section `320-timer` (`#/timer/countdown/1`, `#/timer/styles/1`).

## `timer`

In `scene.ts`: `timer(ctx, { minutes, style, x, y, size, label })` returns `{ show }`. From `decks/demo/sections/320-timer/10-countdown/scene.ts`:

```ts
build: (ctx) => ({ t: timer(ctx, { minutes: 10, style: "ring", x: 700, y: 260, size: 520, label: "Exercise 1: map the process" }) }),
steps: [(tl, r: { t: TimerHandle }) => r.t.show(tl), null],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `minutes` | number | required | the time to count down |
| `style` | `"bar" \| "donut" \| "ring" \| "text"` | required | `bar`: a bar that empties, mm:ss under it. `donut`: a thick arc that empties, mm:ss in its centre. `ring`: a thin circle that empties, mm:ss in its centre. `text`: large mm:ss only |
| `x`, `y` | number | required | the top-left corner, scene units |
| `size` | number | required | the width (the diameter for `donut` and `ring`), scene units. The mm:ss scales with it |
| `label` | string | none | a line under the timer, for example the exercise name |

The remaining part draws in `--k-accent` (then `--k-warn`, then `--k-bad`); the track is `--k-line`.

### Step adders

| Handle | Step |
| --- | --- |
| `show` | fades the timer in. When this step plays, the timer starts; its count begins once the step's camera flight has landed |

### Start, pause and lifecycle

- `T` (and the speaker view's timer button) starts or pauses the timer of the current scene; a click on the timer does the same. It is not a step: the stepper and timeline do not move. On a scene without a timer, `T` does nothing. After "Time's up", `T` resets it to full and paused.
- It keeps running through the later steps of its scene, and back onto its step within the scene leaves it as it is.
- Leaving the scene stops it and resets it to full.
- A deep link or a cut from another scene onto its step shows it full and paused, with "Press T to start" under it.
- With autoplay, it starts when autoplay plays its step.

### `timerState`

`timerState(totalMs, elapsedMs)` returns `{ remainingMs, phase, text }`: `phase` is `"run"`, `"warn"` from 20% left, `"done"` at zero; `text` is `m:ss`, seconds rounded up, so `0:00` shows only when time is up.

### Limits

- The timer sits under `data-k-ignore`: the self-test snapshot leaves its countdown out. Its fade-in is a normal tween.
- Several timers in one scene start, pause and reset together.
- The words come from `strings.ts` in English: the deck language is not on `ctx` yet.
