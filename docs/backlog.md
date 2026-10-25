# Backlog

Open work only, ranked within each section; CHANGELOG.md lists what is done and git history has the old lists. A defect is fixed test-first: if its test already passes, the entry was stale and is dropped.

## Effects

- Decorative loop elements (an animated character, an avatar): the user has them in another repo and brings them over. Check them against the background loop rules (under `data-k-ignore`, still with reduced motion and in the self-test, paused off screen), as `mesh3d` does.
- The demo has no local video file, so the video background has a fixture and a reference entry but no catalog scene; the catalog shows the aurora. A real `media/` clip would let it show both.
- `annotate` on dense code: a ring reaches the lines around it. Documented; a ring that flattens to the line gap would need the code panel's line height.
- Parallax moves one layer, the background. Several depths (a near and a far layer) would need a layer list on the background.

Helpers wanted by the training deck (2026-10-25 harvest; counts are greps over its `sections/` and `shared/`):

- Scene reuse with options: 36 scenes are two-line copies of a shared scene function.
- Self-test checks for ink outside a safe area (margins, footer) and for text clipped by its box; the most frequent look finding.
- Smaller: a typewriter in the brand font, a heading-font token.

New effects, proposed 2026-10-24, not yet specified:

- Kinetic quote: a statement whose key words grow and take `--k-accent` as they are spoken. May share code with `reveal`.
- Word cloud: words sized by weight from a `data/` file, placed without overlap, revealed step by step. Placement must be deterministic (seek equals play, same picture in CI).
- Chat: a messenger thread; messages arrive, a typing indicator shows, the answer streams in. Seek must equal play, so the stream is a pure function of progress, like `typed`.
- Redline: prose changes as strike-through and insert, the text cousin of `code().diff()`.
- Split-flap: an airport-board flip to a number or a word, in the `scramble` family.
- Handwriting: a short phrase writes itself stroke by stroke (needs glyph paths; check fonts and licence).
- Loupe: a magnifying lens slides over a picture and enlarges one detail.

New transitions, proposed 2026-10-24:

- `push`: the new section pushes the old one off in a direction.
- `iris`: a circle opens from a point (default the centre) with an animated `clip-path`.
- Magic move: an element with the same id in both sections flies to its new place while the rest fades. The hardest of these.
- `glitch`: a short digital break-up, for the bold theme.
- Cube: the old section turns away as one face of a cube.
- Page turn: the old section peels off like a page.

New camera moves, proposed 2026-10-24:

- Follow: the camera tracks a moving element (a figure walking, a packet in a flow). Pairs with `travel`.
- Focus pull: all but the target blurs and dims, a depth-of-field cousin of `spotlight`. Mind the blur cost (perf notes).
- Impact shake: a short jolt of the whole scene when something lands; the camera-level twin of `shake`.
- Tilt: a slight 3D lean during a camera flight, so long flights feel less flat.
- Dolly zoom: the "vertigo" move (zoom in while the camera pulls back), for a big reveal.

Wanted by the training deck, not built (from `docs/contrib/2026-10-24-deck-helpers.md`): `timer` separate T groups (needs the deck's use case: how the presenter picks a group); a `dotGrid` helper (needs the deck's use case).

Not on this list, because they exist: code morph (`code().diff()`) and packets along flow edges (`flow().send()`).

## Milestones

- M4: deck template and agents.
- Demo: a local `media/sample.mp4` for the Markdown video scene; the catalog's YouTube scene needs a network too.

## Look and motion polish

Effects:

- CRT: the transition's default bright phase (`brightness(3)`) still washes out the tint; `flash: "soft"` avoids it. Make soft the default? A look change for existing decks, so a user decision.
- Figure: no seated pose; the meeting-room figures read as seated behind the table. A real seated pose (a chair, bent legs) would be a new `figure` option.
- Swarm: the canvas is not re-rasterised on a deeper zoom, so a camera that zooms into a swarm sees soft dots.
- Perf (`docs/perf-m2.md`): with a GPU, the shatter fall lost 0.2 to 1.2 s of a 2.2 s step to long frames (worst 667 ms), the swarm stream about 1 s (worst 467 ms). Not proven; check in a manual 60 fps run.

Demo story:

- Value stream (taste, not defects; the band sits low on purpose, under the scene text, because the SVG layer clips at y 1080): the overview band is modest with a left-aligned caption; the carried stack overlaps the right hand; analysis step 1 is mostly empty; the band's labels sit about 13 px from the bottom edge; the clarification frame puts its stage 20 % from the left.

## Housekeeping

- The types could be consolidated (`src/types.ts` and the effect option types).
