# Backlog

Open work only, ranked within each section; CHANGELOG.md lists what is done and git history has the old lists. A defect is fixed test-first: if its test already passes, the entry was stale and is dropped.

## Effects

- Decorative loop elements (an animated character, an avatar): the user has them in another repo and brings them over. Check them against the background loop rules (under `data-k-ignore`, still with reduced motion and in the self-test, paused off screen), as `mesh3d` does.
- The demo has no local video file, so the video background has a fixture and a reference entry but no catalog scene; the catalog shows the aurora. A real `media/` clip would let it show both.
- `annotate` on dense code: a ring reaches the lines around it. Documented; a ring that flattens to the line gap would need the code panel's line height.
- Parallax moves one layer, the background. Several depths (a near and a far layer) would need a layer list on the background.

Open review findings on the 2026-10-24 effects (round 3, not fixed yet):

- `roadmap` `move(date)` updates the marker date when called, not inside its step adder (`src/fx/roadmap.ts:194`). Adders built out of step order make the marker jump. Fix as matrix did in 65d987a: move `from`/`todayMs` into the returned adder; add an out-of-order fixture scene and a deep-link assert. Defect, so first.
- `roadmap` still animates with reduced motion (marker slide, dot pop) while `travel` jumps. Jump, or say so in `roadmap.md`.
- `roadmap`: the today line cuts through month tick labels (it rests on "Dec" at the demo's last step). Give tick labels the `--k-bg` knockout the milestone labels have.
- `tests/e2e/fx-travel.e2e.test.ts:46` waits on the wall clock mid-travel; use `page.clock` as `fx-reveal` does.
- Travel demo (`285-travel/10-parcel`): the parcel stops beside the house (end the path at the tile edge, y 420); the plane draws for 1 s before it flies and stops above the warehouse.
- Matrix: the left column has two insets (names 32 px, chips 16 px). Accept, or use one inset.
- Docs: `roadmap.md:47` (only dot, stem and title take the accent; the date stays `--k-muted`; it settles on the next roadmap step, not the next step); `effects.md` burst canvas is "a square, 2 × radius wide, centred on `origin`"; `docs/reference/index.md:23` drop "; demo section `305-roadmap`".

New effects, proposed 2026-10-24, not yet specified:

- `video` options `autoplay` and `muted` for YouTube and Vimeo embeds: with `autoplay: true` the player starts when its step arrives (the URL's `autoplay=1` plus `allow="autoplay"` on the iframe); `muted` defaults to `true`. `muted: false` asks for sound, which a browser may still block; say what happens then. Default stays: the viewer starts the player. Local files already play on their step.
- Chart types `funnel` and `sankey`: common in business decks, missing from `chart`.
- `gauge`: a needle swings to a value; sits beside `kpi` and `progress`.
- Sticky notes: notes appear, then move into groups (an affinity map), for workshop decks.
- Kinetic quote: a statement whose key words grow and take `--k-accent` as they are spoken. May share code with `reveal`.
- Word cloud: words sized by weight from a `data/` file, placed without overlap, revealed step by step. Placement must be deterministic (seek equals play, same picture in CI).

New transitions, proposed 2026-10-24:

- `push`: the new section pushes the old one off in a direction.
- `iris`: a circle opens from a point (default the centre) with an animated `clip-path`.
- Magic move: an element with the same id in both sections flies to its new place while the rest fades. The hardest of these.
- `glitch`: a short digital break-up, for the bold theme.

New camera moves, proposed 2026-10-24:

- Follow: the camera tracks a moving element (a figure walking, a packet in a flow). Pairs with `travel`.
- Focus pull: all but the target blurs and dims, a depth-of-field cousin of `spotlight`. Mind the blur cost (perf notes).
- Impact shake: a short jolt of the whole scene when something lands; the camera-level twin of `shake`.
- Tilt: a slight 3D lean during a camera flight, so long flights feel less flat.

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
