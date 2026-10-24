# Backlog

Open work only, ranked within each section; CHANGELOG.md lists what is done and git history has the old lists. A defect is fixed test-first: if its test already passes, the entry was stale and is dropped.

## Effects

- Decorative loop elements (an animated character, an avatar): the user has them in another repo and brings them over. Check them against the background loop rules (under `data-k-ignore`, still with reduced motion and in the self-test, paused off screen), as `mesh3d` does.
- The demo has no local video file, so the video background has a fixture and a reference entry but no catalog scene; the catalog shows the aurora. A real `media/` clip would let it show both.
- `annotate` on dense code: a ring reaches the lines around it. Documented; a ring that flattens to the line gap would need the code panel's line height.
- Parallax moves one layer, the background. Several depths (a near and a far layer) would need a layer list on the background.

Wanted by the training deck, not built (from `docs/contrib/2026-10-24-deck-helpers.md`): `timer` separate T groups (needs the deck's use case: how the presenter picks a group); a `dotGrid` helper; lazy embeds one step early.

Not on this list, because they exist: code morph (`code().diff()`) and packets along flow edges (`flow().send()`).

## Milestones

- M4: deck template and agents.
- Demo: a local `media/sample.mp4` for the Markdown video scene; the catalog's YouTube scene needs a network too.

## After M3

- The bold look review was a manual pass over the last step of each scene; the `klappe-review-look` agent did not run. Mid-step states (shatter fall, swarm stream) were not looked at in bold.

## Look and motion polish

Effects:

- Shatter: a black backdrop strip shows at the top mid-fall; the box is measured at the crack but the copy is taken at the fall; the black gaps layer (`src/fx/shatter.ts`) holds a black rectangle until a 0.4 s fade at the end.
- CRT: bloom edges slightly olive-grey; amber READY cursor not captured in a shot (blink phase); long-text floor at about 14 px. The CRT transition's default bright phase (`brightness(3)`) still washes out the tint; `flash: "soft"` avoids it, and the default stays as decks have it.
- Shout: the `back.out` overshoot is not checked visually; the new one-click enter (straight to 1.04 calm, 1.12 bold) is not checked at full speed.
- Figure: clearer arm swing (10 to 15 degrees); the seated figure needs a chair and arms; standing figures closer and the group larger at 1366.
- Swarm and morph: dots cross the Inbox label mid-flight; the landed pile is a uniform grey; morph text has low contrast mid-frame, and morph scales the text with the box, so "Key fact" overflows its card; the swarm canvas is not re-rasterised on a deeper zoom.
- Full-frame pictures: a flat 0.6 scrim darkens the whole picture; a gradient scrim, dark only under the text, keeps more of it.
- Perf (`docs/perf-m2.md`): with a GPU, the shatter fall lost 0.2 to 1.2 s of a 2.2 s step to long frames (worst 667 ms), the swarm stream about 1 s (worst 467 ms). Not proven; check in a manual 60 fps run.

Engine and panels:

- The step title fades in 0.6 s after a camera move ends.
- Speaker view: the current step as the largest text, larger notes, type that scales with the window, an "N / M" progress, the next preview clamped to 2 lines.
- Overview thumbnails show no backgrounds (clone `c.el` and clear the world transform); the selector marks the current section only with its focus ring.

Demo story:

- Opening: the black hold is its own click; the power-on flash is a flat mint card; no cursor at power-on; old-way step 1 reads as a slide description; the placeholder logo is not in a TODO.
- Value stream: the overview band is modest with a left-aligned caption; the carried stack overlaps the right hand; analysis step 1 is mostly empty; the clarification-2 label sits about 10 px from the bottom edge; the clarification box sits about 20 % from the left.
- Light themes: the title's small footer text sits on a dark photo, and the icon catalog asks for the CRT tones (`phosphor`, `phosphor-amber`) by name, which are pale on a light stage.
- Global team and meeting: the "Decide." shout dims differently from the question steps; coastlines cut site-name digits; arcs cross arriving figures in the zoomed host shot; meeting figures are dimmed by reaching into the figure DOM; map labels are turned off through empty text.

## Housekeeping

- `OverlayPanel` and `button` live in `ui/selector.ts`; a `ui/panel.ts` would fit. The speaker view looks its scene up twice. Speaker CSS sits in `styles.css`. The types could be consolidated.
- The shout effect finds its answer with a DOM query; the WeakMap it already keeps would do.
- `src/fx/transitions.ts` and `src/render/parts.ts` each keep a small lazy-loader table; one helper could serve both.
