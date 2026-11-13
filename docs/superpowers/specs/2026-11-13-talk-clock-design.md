# Talk clock overlay: design

For klappe 1.1.0, branch `release/1.1.0`. A small change.

## Why

The presenter wants to blend a live clock and the talk's time over any scene with one key press, and blend it out again: for a break, a workshop exercise, or a room without a wall clock. The `timer` element is one scene's countdown, placed in `scene.ts`; the speaker view's clock is only for the presenter.

## Approaches

- **Picked: one chip in klappe's UI layer, toggled by `C`.** It shows the wall clock and the talk time, and it lives with the overview and the section list, so PDF, shot and video never show it.
- **Dropped: an `overlay.ts` helper the deck adds.** Every deck would need code for something every talk can use.
- **Dropped: separate keys for the clock and the countdown.** That's two keys to remember for one small chip.

## Design (calls made without asking, to check)

- **`C` blends the chip in and out** (0.3 s fade; instant with reduced motion). It also works from the speaker view: `C` there, or its Clock button, sends a `clock` command like the timer's.
- **Contents.** The chip shows the wall clock as `14:32`, in the deck language's format, then the talk time. With `duration` in `deck.md` (or the cut's), that's the time left, `23:10 left`. It turns `--k-warn` in the last 5 minutes, or the last fifth of a talk shorter than 25 minutes, then shows `+2:15 over` in `--k-bad`. Without `duration` it shows the elapsed time, `12:04`.
- **When talk time starts.** At the first move off the step the deck opened on, so opening the deck early doesn't eat into the talk. Before that it shows the full duration, or `0:00`.
- **Placement.** Bottom right, inside the safe area, in `--k-surface` with `--k-muted` text at `--k-size-label`. It sits under the problems overlay and the panels.
- It's on the wall clock and lives in `.k-ui` with `data-k-ignore`, so the walk, PDF, shot and video never see it. Colours come from `--k-*` tokens only.
- **Words.** "left" and "over" are klappe words in `src/strings.ts` (English and German).

## Checks

e2e on a fixture with `duration: 1`, using Playwright's clock: `C` shows the chip with a clock and `1:00 left`; after the first step and 30 s it shows `0:30 left`, after 50 s `0:10 left` in `--k-warn`; after 90 s, `+0:30 over` in `--k-bad`; `C` again hides it; a `clock` command from the speaker channel toggles it. Docs: the keys tables (README, deck format), CHANGELOG, and the backlog entry removed.
