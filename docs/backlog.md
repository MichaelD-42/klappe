# Backlog

One ranked list, rebuilt from the M1 and M2 review findings on 2026-10-24; git history has the old lists. A defect is fixed test-first: if its test already passes, the entry was stale and is dropped.

## Defects and gaps from M1 and M2

Done on branch `backlog-m1-m2` (2026-10-24): every entry is fixed, or was found stale by its test. CHANGELOG.md, under Unreleased, lists what changed.

## Waiting on a decision

- Shout-out takes two clicks to reach full size; it should take one (user, 2026-10-24). `enter` scales the question from `from` to 1, and `hold`, the next click, pushes it on to `push` (1.04 calm, 1.12 bold) over 2 to 2.5 s (`src/fx/shout.ts`). Fix: `enter` grows straight to `push`; then drop `hold` (three steps: enter, fade, answer) or keep a still hold. Dropping it changes the four-step contract in the parser (`shout-hold`), the renderer (`src/render/world.ts`), `effects.md`, `markdown.md` and every `scene.ts` that plays the four adders (the shout catalog section, value-stream clarification, the meeting scene).
- Bundle size: every deck carries every effect, all Lucide icons, world-atlas and d3 (1.8 MB of JS for the demo). Options: an `IconNode` input for `icon()`, lazy effect imports. The self-test and the test fixtures are about 3 % of it; loading them only when asked needs an async start.

## Milestones

- M3 Task 14, close-out: perf numbers in `docs/perf-m3.md` and the look review with `?theme=bold`.
- PDF export and offline fonts (the single-file build is dropped; see DECISIONS).
- M4: deck template and agents.
- Demo: a local `media/sample.mp4` for the Markdown video scene; the catalog's YouTube scene needs a network too.

## Look and motion polish

Effects:

- Shatter: a black backdrop strip shows at the top mid-fall; the box is measured at the crack but the copy is taken at the fall; the black gaps layer (`src/fx/shatter.ts`) holds a black rectangle until a 0.4 s fade at the end.
- CRT: bloom edges slightly olive-grey; amber READY cursor not captured in a shot (blink phase); long-text floor at about 14 px. The CRT transition's bright phase is a flat `#dadada`; `brightness(3)` washes out the phosphor tint, so calm decks get an off-white flash.
- Shout: the `back.out` overshoot is not checked visually.
- Figure: clearer arm swing (10 to 15 degrees); the seated figure needs a chair and arms; standing figures closer and the group larger at 1366.
- Swarm and morph: dots cross the Inbox label mid-flight; the landed pile is a uniform grey; morph text has low contrast mid-frame, and morph scales the text with the box, so "Key fact" overflows its card; the swarm canvas is not re-rasterised on a deeper zoom.
- Full-frame pictures: a flat 0.6 scrim darkens the whole picture; a gradient scrim, dark only under the text, keeps more of it.
- Perf (`docs/perf-m2.md`): with a GPU, the shatter fall lost 0.2 to 1.2 s of a 2.2 s step to long frames (worst 667 ms), the swarm stream about 1 s (worst 467 ms). Not proven; check in a manual 60 fps run.

Engine and panels:

- A 1 px subpixel edge at 1366.
- The step title fades in 0.6 s after a camera move ends.
- Speaker view: the current step as the largest text, larger notes, type that scales with the window, an "N / M" progress, the next preview clamped to 2 lines.
- Overview thumbnails show no backgrounds (clone `c.el` and clear the world transform); the selector marks the current section only with its focus ring.

Demo story:

- Opening: the black hold is its own click; the power-on flash is a flat mint card; no cursor at power-on; old-way step 1 reads as a slide description; the placeholder logo is not in a TODO.
- Value stream: the overview band is modest with a left-aligned caption; the carried stack overlaps the right hand; analysis step 1 is mostly empty; the clarification-2 label sits about 10 px from the bottom edge; the clarification box sits about 20 % from the left.
- Global team and meeting: the "Decide." shout dims differently from the question steps; coastlines cut site-name digits; arcs cross arriving figures in the zoomed host shot; meeting figures are dimmed by reaching into the figure DOM; map labels are turned off through empty text.

## Housekeeping

- `OverlayPanel` and `button` live in `ui/selector.ts`; a `ui/panel.ts` would fit. The speaker view looks its scene up twice. Speaker CSS sits in `styles.css`. The types could be consolidated.
- The shout effect finds its answer with a DOM query; the WeakMap it already keeps would do.
