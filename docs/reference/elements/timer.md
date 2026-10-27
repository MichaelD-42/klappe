# Timer: `timer`

A countdown for an exercise or a break in a training. It counts real minutes on the wall clock, not timeline time: the one element where seek does not equal play. In the last 20% it turns `--k-warn`; at zero it turns `--k-bad` and shows "Time's up".

Catalog: section `320-timer` (`#/timer/countdown/1`, `#/timer/styles/1`, `#/timer/until/1`).

## `timer`

In `scene.ts`: `timer(ctx, { minutes, cycle, style, x, y, size, label })` or `timer(ctx, { until, style, x, y, size, label })` returns `{ el, show, hide }`; `el` is the timer's block, for a scene that places or moves it. From `decks/demo/sections/320-timer/10-countdown/scene.ts`:

```ts
build: (ctx) => ({ t: timer(ctx, { minutes: 10, style: "ring", x: 700, y: 260, size: 520, label: "Exercise 1: map the process" }) }),
steps: [(tl, r: { t: TimerHandle }) => r.t.show(tl), null],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `minutes` | number | one of `minutes` and `until` | the time to count down. Starts with `T` (see below) |
| `until` | string | one of `minutes` and `until` | `"HH:MM"`, a wall-clock time today. The timer counts to it (see Until a time). Set exactly one of `minutes` and `until`; else the deck gets the problem `timer: set exactly one of minutes and until` |
| `cycle` | boolean | `false` | `minutes` only: after "Time's up", one `T` starts the next run at full time, for one run per speaker (for example `minutes: 1.5` for a 90-second pitch). With `until`, the deck gets the problem `timer: cycle needs minutes, not until` |
| `style` | `"bar" \| "donut" \| "ring" \| "text"` | required | `bar`: a bar that empties, mm:ss under it. `donut`: a thick arc that empties, mm:ss in its centre. `ring`: a thin circle that empties, mm:ss in its centre. `text`: large mm:ss only |
| `x`, `y` | number | required | the top-left corner, scene units |
| `size` | number | required | the width (the diameter for `donut` and `ring`), scene units. The mm:ss scales with it |
| `label` | string | none | a line under the timer, for example the exercise name. It carries `data-k-timer-label`, so a deck's `deck.css` can set its font and colour: `[data-k-timer-label] { font-family: ...; color: var(--k-accent); }` |

The remaining part draws in `--k-accent` (then `--k-warn`, then `--k-bad`); the track is `--k-line`.

### Step adders

| Handle | Step |
| --- | --- |
| `show(tl, at?)` | fades the timer in, at the GSAP position `at` (default: the end of the timeline). When this step plays, the timer starts; its count begins once the step's camera flight has landed |
| `hide(tl, at?)` | fades the timer out. From this step on it is stopped and reset, as when its scene is left, and `T` no longer reaches it; back before this step, the rules below apply again |

### Start, pause and lifecycle

These rules are for `minutes`. An `until` timer runs by itself (see Until a time).

- `T` (and the speaker view's timer button) starts or pauses the timer of the current scene; a click on the timer does the same. It is not a step: the stepper and timeline do not move. On a scene without a timer, `T` does nothing and the speaker view's timer button is disabled. After "Time's up", `T` resets it to full and paused. With `cycle`, `T` resets it and starts it again.
- It keeps running through the later steps of its scene, and back onto its step within the scene leaves it as it is.
- Leaving the scene stops it and resets it to full.
- A deep link or a cut from another scene onto its step shows it full and paused, with "Press T to start" under it.
- With autoplay, it starts when autoplay plays its step.

### Until a time

With `until`, the timer shows the time left to `HH:MM` today on the wall clock.

- It runs whenever its step is in view: after the step plays, after a deep link and after a cut onto it. `T` does nothing to it. A click on it steps the deck, as a click anywhere does.
- Leaving the scene stops it. Back in view, it shows the true time left again.
- It never goes negative. At zero, and for a time that has passed, it shows `0:00`, "Time's up" and `--k-bad`.
- The ring, donut and bar empty from the time left when the step came into view. The last 20% of that time is the warn phase.
- A time past midnight is not "tomorrow": `until: "00:30"` at 23:50 shows "Time's up".

From `decks/demo/sections/320-timer/30-until/scene.ts`:

```ts
past: timer(ctx, { until: "00:00", style: "ring", x: 1100, y: 260, size: 520, label: "Started at midnight" }),
```

### `untilMs`

`untilMs(until, nowMs)` returns the ms from `nowMs` to `until` today, local time, and 0 once it has passed. Example: `untilMs("10:20", <10:05:30>)` is 870000, so the timer reads `14:30`.

### `timerState`

`timerState(totalMs, elapsedMs)` returns `{ remainingMs, phase, text }`: `phase` is `"run"`, `"warn"` from 20% left, `"done"` at zero; `text` is `m:ss` (minutes may pass 59, for example `75:00`), seconds rounded up, so `0:00` shows only when time is up.

### Limits

- The timer sits under `data-k-ignore`: the self-test snapshot leaves its countdown out. Its fade-in is a normal tween.
- Several timers in one scene start, pause and reset together.
- The words come from `strings.ts` in the deck language: English, or German for `lang: de`; any other language shows English.
