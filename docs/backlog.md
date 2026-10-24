# Backlog

One ranked list, rebuilt from the M1 and M2 review findings on 2026-10-24; git history has the old lists. A defect is fixed test-first: if its test already passes, the entry was stale and is dropped.

## Defects and gaps from M1 and M2

Done on branch `backlog-m1-m2` (2026-10-24): every entry is fixed, or was found stale by its test. CHANGELOG.md, under Unreleased, lists what changed.

## Done on branch `ccr-01ec298b-ee1qc5` (2026-10-24)

- Shout-out: one click to full size; the `hold` step is gone (user decision: drop it).
- Bundle size (user decision: all three): only the Lucide icons a deck names are bundled, `icon()` takes an `IconNode`, and an async start loads effects, Shiki, transitions, the self-test and the fixtures only when needed. Numbers in `docs/perf-m3.md`.
- M3 Task 14: `docs/perf-m3.md`; the look review with `?theme=bold` (76 scenes at 1920 and 1366, no deck problems) found the stale shout caption, now fixed.

## Effects, M4 (user decision 2026-10-24)

Done on branch `effects-m4` (2026-10-24), each with a catalog scene, a reference entry and tests: animated backgrounds (a looping `.mp4`/`.webm` or `animate: "aurora"`), full-screen `video()` with no `rect`, `spotlight`, `annotate`, `wipe`, `scramble`, `parallax: true` on a background, `qr`. CHANGELOG.md, under Unreleased, lists them. Also fixed: the speaker view's timer button is disabled on a scene without a timer.

Open:

- Mesh3d and decorative loop elements (an animated character, an avatar): the user has both in another repo and brings them over. Mesh3d brings its own loop; check it against the background loop rules (under `data-k-ignore`, still with reduced motion and in the self-test, paused off screen).
- The demo has no local video file, so the video background has a fixture and a reference entry but no catalog scene; the catalog shows the aurora. A real `media/` clip would let it show both.
- `annotate` on dense code: a ring reaches the lines around it. Documented; a ring that flattens to the line gap would need the code panel's line height.
- Parallax moves one layer, the background. Several depths (a near and a far layer) would need a layer list on the background.

Not on this list, because they exist: code morph (`code().diff()`) and packets along flow edges (`flow().send()`).

## Milestones

- Offline fonts (the single-file build is dropped; see DECISIONS; PDF export is done).
- M4: deck template and agents.
- Demo: a local `media/sample.mp4` for the Markdown video scene; the catalog's YouTube scene needs a network too.

## After M3

- The bold look review was a manual pass over the last step of each scene; the `klappe-review-look` agent did not run. Mid-step states (shatter fall, swarm stream) were not looked at in bold.

## Look and motion polish

Effects:

- Shatter: a black backdrop strip shows at the top mid-fall; the box is measured at the crack but the copy is taken at the fall; the black gaps layer (`src/fx/shatter.ts`) holds a black rectangle until a 0.4 s fade at the end.
- CRT: bloom edges slightly olive-grey; amber READY cursor not captured in a shot (blink phase); long-text floor at about 14 px. The CRT transition's bright phase is a flat `#dadada`; `brightness(3)` washes out the phosphor tint, so calm decks get an off-white flash.
- Shout: the `back.out` overshoot is not checked visually; the new one-click enter (straight to 1.04 calm, 1.12 bold) is not checked at full speed.
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
- `src/fx/transitions.ts` and `src/render/parts.ts` each keep a small lazy-loader table; one helper could serve both.
