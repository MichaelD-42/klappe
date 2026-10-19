# klappe M2: Effects, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development with the build loop from the spec: an orchestrator, one builder per task, and three reviewers (technical, look and feel, content).
>
> **Parallel by design:**
>
> - **Wave 0** runs alone.
> - **Wave 1** tasks run at the same time, each in its own git worktree, and touch only their own files.
> - **Wave 2** tasks run at the same time again.
> - **Wave 3** closes the milestone.

**Goal:** every effect in the M2 design works, is seekable, is tested on its own fixture deck, and is shown in the full demo deck.

**Architecture:**

- **Effect files:** each effect is one file, `src/fx/<name>.ts`, exported through `klappe/fx`.
- **Helper shape:** a helper builds hidden DOM at build time and returns step functions that add tweens to the canvas timeline.
- **Shared seams:** Wave 0 lays down every shared seam up front, so Wave 1 builders never edit the same file. The seams are the fx index, stubs, the transition registry, the fixture folder, Markdown media detection, the media layout, the snapshot extensions and the dependencies.

**Tech stack:**

- Vite, TS, GSAP 3.15 with MotionPathPlugin.
- d3 for scales, shapes and axes only.
- world-atlas and topojson-client.
- lucide.
- Vitest and Playwright.

**Spec:** `docs/superpowers/specs/2026-10-16-klappe-m2-effects-design.md`. The M1 design and `docs/storyteller-init-prompt.md` still apply. The visual bar is `docs/superpowers/spikes/opening/` (the spike HTML plus screenshots).

## Global constraints

- **Timeline rule.**
  - Each canvas has one timeline. DOM and SVG exist at load. Step functions only add tweens.
  - Do not use `.from()`. Use `fromTo`.
  - `onUpdate` may write DOM only as a pure function of `this.progress()`. `onComplete` and `.call()` must not change state.
- **Self-test.** The walk (play equals seek, ≥ 14 px at 1366, inside the frame) must pass for every fixture and demo scene at 1920, 1366 and 1024.
- **Design rules.** No cream or off-white, no italic accent words in headlines, no "01/02" labels, no pill buttons, no monospace labels. Monospace is allowed only under `.k-retro`. Colours come from theme tokens (`--k-*`).
- **Libraries.** Only these, all approved: gsap with its plugins, d3, world-atlas, topojson-client, lucide. Ask before adding anything else. Every library is installed in Wave 0 only.
- **Content.** No invented facts. Demo charts use labelled sample data: "Sample data" shows on screen and the data file says `source: klappe demo sample`. Sites stay `[Site N]`.
- **Fixtures.** Content-dependent tests load in-code fixture decks via `?fixture=`, so `klappe test` stays green in deck repos. Acceptance checks run on the demo deck only.
- **Builders.**
  - A Wave 1 or Wave 2 builder edits only the files listed in its task.
  - Shared files belong to the orchestrator. They are listed under Task 0.
  - A builder that needs a shared change stops and reports it.

## Review focus

These are the risks most likely to bite. Each has its test in the named task.

1. **Re-entry after a deep link.** A deep link into the middle of a typed CRT line or a half-grown chart must show exactly the play state. _(Task 0: snapshot covers `data-k-text` and `data-k-progress`. Each effect task: walk on its fixture.)_
2. **Shatter on a weak laptop.** 30 full DOM clones may stutter. _(Task 1: frame-time report, shard count as an option.)_
3. **Missing data or media mid-talk.** It must show a visible placeholder, never crash or go blank. _(Tasks 4 and 9: fixtures with missing files.)_
4. **Back across a shatter or CRT transition.** It must cut cleanly to the previous step, with no leftover shards or scanlines. _(Tasks 1 and 2: e2e test.)_
5. **The 1366 legibility check on media and charts in the default layout.** _(Tasks 0 and 4.)_

---

## Wave 0, alone

### Task 0: fx foundation (shared seams)

**Files.** This task is the only one allowed to touch:

- `package.json` and the lock file
- `vite.config.ts`, `tsconfig.json`, `bin/klappe.mjs`
- `src/types.ts`, `src/parse/scene.ts`, `src/render/world.ts`, `src/stepper.ts`, `src/selftest.ts`
- `src/deck/fixtures.ts`, `src/deck/load.ts` and the new `src/deck/fixtures/`
- the new `src/fx/*`
- `README.md` and `DECISIONS.md`

**Interfaces it produces.** Everything later tasks rely on.

- **Dependencies.**
  - Install: `npm i d3 world-atlas topojson-client lucide` and `npm i -D @types/d3 @types/topojson-client`.
  - GSAP plugins come from the installed `gsap` package (`gsap/MotionPathPlugin`).
- **`klappe/fx` import.**
  - Add a Vite `resolve.alias` entry: `klappe/fx` → `<klappe>/src/fx/index.ts`.
  - Add a tsconfig `paths` entry with the same mapping.
  - `klappe init` writes `"klappe/fx": ["./klappe/src/fx"]` next to the existing `klappe/types` mapping.
- **Stub files.** Create one stub per effect, each with its final signature and a body that throws `new Error("<name>: not built yet")`. `src/fx/index.ts` re-exports them all.

  | File         | Exports                        |
  | ------------ | ------------------------------ |
  | `shatter.ts` | `shatter`, `transitionShatter` |
  | `crt.ts`     | `crt`, `transitionCrt`         |
  | `draw.ts`    | `drawOn`, `lineArt`            |
  | `icons.ts`   | `icon`, `iconTile`             |
  | `shout.ts`   | `shout`                        |
  | `chart.ts`   | `chart`, `parseCsv`            |
  | `map.ts`     | `worldMap`                     |
  | `figure.ts`  | `figure`                       |
  | `swarm.ts`   | `swarm`, `swarmPoint`          |
  | `motion.ts`  | `morph`, `bubble`, `counter`   |
  | `media.ts`   | `image`, `video`               |
  | `zoom.ts`    | `transitionZoom`               |

  - **Common shape.** Every helper is `name(ctx: Ctx, opts) => Handle`. It builds hidden DOM in `ctx.svg` or `ctx.html` at call time. `Handle` holds named step adders `(tl: gsap.core.Timeline) => void`. Each effect's opts and handle are fixed in its task below.
  - **Transition signature.** A transition is `(from: CanvasRuntime, to: CanvasRuntime, opts) => gsap.core.Timeline`, a standalone timeline that the stepper awaits.

- **`src/fx/transitions.ts`.** Holds the registry:

  ```ts
  { cut, fade, blackout, zoom: transitionZoom, shatter: transitionShatter, crt: transitionCrt }
  ```

  - `cut`, `fade` (the existing crossfade, moved here) and `blackout` (fade to black 0.4 s, hold 0.3 s, fade in) are implemented in this task.
  - `SectionModule` gains `transition?: keyof typeof registry` and `zoomTarget?: string`.
  - On a forward move by one step onto a new canvas, the stepper looks up the target section's `transition` (default `fade`) and plays it.
  - `instant` mode, and every back move or jump, cuts as before.
  - The `transition` event payload is `{ kind }`.
  - If an effect's transition still throws "not built yet", the stepper falls back to `fade` and logs the error with `console.error`. This keeps Wave 1 independent.

- **Fixture folder.**
  - Move `src/deck/fixtures.ts` content to `src/deck/fixtures/*.ts`, one deck per file (`two-scenes.ts`, `broken-step-count.ts`).
  - `loadFixture` discovers them with `import.meta.glob('./fixtures/*.ts', { eager: true })`, keyed by file name.
  - Wave 1 tasks add `fx-<name>.ts` there, with no shared edits.
- **Markdown media detection** in `src/parse/scene.ts`. `StepDoc` gains:

  ```ts
  media?: { kind: 'image' | 'video' | 'chart'; href: string; alt: string; title?: string }
  ```

  - `![alt](media/x.png "title")` → image.
  - A link to `youtube.com`, `youtu.be`, `vimeo.com`, or a link ending in `.mp4` or `.webm` → video.
  - A link to `data/*.csv` or `data/*.json` → chart.
  - Unit tests cover each kind, a plain link that stays text, and an image with a title.

- **Default media layout** in `src/render/world.ts`.
  - A scene without a `build` and with media steps puts the text column on the left (≤ 45 % width) and a media slot on the right.
  - The media slot calls `image`, `video` or `chart` from `klappe/fx` inside `safe()`. While the stub throws, the slot shows a visible "EFFECT MISSING: `kind`" box and records a problem.
- **Self-test snapshot** additions in `src/selftest.ts`:
  - `textContent` of `[data-k-text]` elements;
  - the `data-k-progress` attribute of any element (swarm and canvas layers write their progress there);
  - legibility also checks `[data-section]` text (backlog item).
  - Unit or e2e proof: a fixture with a `data-k-text` element whose text changes in `onUpdate` passes the walk, and fails when the `onUpdate` uses wall-clock time.
- **Seams for later tasks** (so Wave 1 never touches shared files):
  - The default renderer calls `shout` from `klappe/fx` for the four shout step kinds, inside `safe()`, and falls back to M1 text rendering while the stub throws.
  - `src/deck/load.ts` also globs `@deck/data/*` (raw) and `@deck/media/*` (URL) and exposes them on `ctx.files` (add `files: { data: Record<string, string>; media: Record<string, string> }` to `Ctx`).
  - The snapshot skips elements with `data-k-ignore`.
  - `bin/klappe.mjs` build and test call `writeTodos(deckDir)` from `bin/todo.mjs` through a guarded dynamic import (no-op if absent).
  - `world.ts` exposes the stepper's `step` event to helpers via `ctx.onStep(fn)` (for video play and pause).
- **Docs.** A README section "Effects" with the helper shape, the `klappe/fx` import and the transition names. A DECISIONS entry for the relaxed `onUpdate` rule.

**Steps:**

- [ ] Step 1. Write the failing unit tests: media detection, fixture discovery, the transition registry fallback.
- [ ] Step 2. Implement in this order: dependencies → alias and paths → stubs and index → transitions and stepper hook → fixture folder → media detection → default media layout → snapshot additions → docs.
- [ ] Step 3. Run `npm test` and `npx tsc --noEmit`, both green. The M1 AC suite stays green, and AC-5 still sees `fade`.
- [ ] Step 4. Commit in logical pieces, messages starting `feat(fx):`.

---

## Wave 1, all in parallel (one worktree per task)

### Shared rules for every Wave 1 task

- **Own files only:**
  - `src/fx/<own>.ts`;
  - `tests/unit/fx-<own>.test.ts`, for pure maths;
  - `src/deck/fixtures/fx-<own>.ts`;
  - `tests/e2e/fx-<own>.e2e.test.ts`;
  - for line art, `src/fx/art/*.svg`.

  Nothing else.

- **Fixture deck.** It exercises every step adder and every option, with one scene per variant.
- **e2e test.**
  - Run `runSelftest(BASE_URL + '/?selftest=walk&fixture=fx-<own>', vp)` at 1920×1080, 1366×768 and 1024×768.
  - The result must have `ok`, no problems and no errors.
- **Screenshots** for the look reviewer go to `<scratchpad>/m2-<own>/`: every fixture step at 1920, and the key steps at 1366.
- **Done means:** `npm test` and `npx tsc --noEmit` are green in the worktree, the commit is made, and the report lists the screenshot paths.

### Task 1: Shatter and crack (`shatter.ts`)

- **Signature.** `shatter(ctx, { target: Element, impact?: {x, y}, shards?: number = 30, fall?: number = 1, toViewer?: number = 0.25, seed?: number })` returns `{ crack(tl), crack2(tl), fall(tl) }`.
- **Build time.**
  - Generate deterministic crack lines from the impact point: seeded RNG, radial rays plus rings, as in the spike.
  - Cut shard polygons along those cracks.
  - Clone `target`, in its visible end state, into hidden clip-path shards.
- **Step adders.**
  - `crack` draws the crack strokes fast from the impact point, with a flash and a shake.
  - `crack2` runs the cracks out to the edges.
  - `fall` hides the original, shows the shards, pops them apart, then plays a `power2.in` fall with 3D tumble. The `toViewer` share scales up and blurs.
- **`transitionShatter(from, to, opts)`.** Plays crack plus fall on a clone of the `from` world's visible frame, then cuts to `to`.
- **Unit tests.**
  - Every point on screen lies in exactly one shard. Sample a grid.
  - The same seed gives the same polygons.
  - The shard count matches the option within ±20 %.
- **e2e.**
  - The walk passes on the fixture.
  - A frame-time report logs the average and p95 frame time of the fall step at real speed, using `requestAnimationFrame` deltas. It is reported only, not asserted.
  - Back across the shatter step leaves no shard visible.
- **Look bar:** the spike screenshots `shot-shatter-mid.png` and `shot-before-black.png`.

### Task 2: CRT (`crt.ts`)

- **Signature.** `crt(ctx, { color?: 'green' | 'amber' = 'green', lines: string[] })` returns `{ powerOn(tl), type(tl, lineIndex | 'all'), ready(tl) }`.
- **Visuals.** `.k-retro` root, monospace allowed. Scanlines, vignette and rounded screen corners. Glow via `--k-phosphor`.
- **Animation.**
  - Flicker and the cursor blink are CSS loops, which is allowed. They are decoration and are kept out of the snapshot through a `data-k-ignore` attribute that the snapshot skips. If Task 0's snapshot lacks this, report it.
  - Typing writes `textContent` from progress in `onUpdate` on `[data-k-text]` elements.
- **`transitionCrt`.** The old canvas collapses to a line, then a flash, then the new canvas expands.
- **Unit test.** The typed text at progress p equals `full.slice(0, round(p * len))`.
- **e2e.** Deep link to a mid-typing step boundary shows the full line typed. The walk passes.
- **Look bar:** the spike screenshot `shot-ready.png`.

### Task 3: Line art and icons (`draw.ts`, `icons.ts`, `src/fx/art/*.svg`)

- **`drawOn`.** `drawOn(els, { duration = 0.9, each = 0.06 })` returns a step adder.
  - It sets `pathLength=1` on each shape.
  - With `vector-effect: non-scaling-stroke`, it scales the dash by the CTM scale. Port this rule from the advisor's `fx.js` (lines 100–130).
  - It ends with a plain stroke.
- **`lineArt`.** `lineArt(ctx, { src: string /* svg file content via ?raw */, x, y, w })` returns `{ draw(tl), glow(tl, selector) }`.
  - It injects the SVG and normalises the strokes: round caps and joins, `currentColor`.
  - Ship two hand-written SVGs in `src/fx/art/`: `engineer-desk.svg`, ported from the spike, and `value-stream.svg`. Each has 30–60 strokes.
- **`icon` and `iconTile`.**
  - `icon(ctx, name: lucide name, { x, y, size = 96, color })` and `iconTile(ctx, name, { x, y, size = 96, tone })` each return `{ draw(tl), light(tl) }`.
  - They port the advisor v2 treatment from `C:\workspace\claude-advisor\topics\ai-at-rd\presentation-v2\src\engine\icons.js` (`paint`, `tile`, lines 201–277): 2 px non-scaling strokes, a 0.2 tint inside closed shapes, and the tile with a gradient well, a hairline edge and a glow.
  - Use theme tokens for tones.
  - Glyph data comes from the `lucide` package's icon node arrays.
- **Unit test.** A known Lucide name builds shapes. An unknown name records a problem and draws a fallback.
- **Look bar:** the spike screenshot `shot-draw-done.png` and the advisor v2 tiles.

### Task 4: Charts (`chart.ts`)

- **Signature.** `chart(ctx, { src: string /* data file path */, data?: Row[] | null, type: 'bar' | 'stacked' | 'line' | 'waterfall' | 'timeline' = 'bar', rect, title?, sample?: boolean })` returns `{ axes(tl), grow(tl), values(tl) }`.
  - d3 provides scales, shapes and axes. GSAP provides the motion.
  - Values count up via `onUpdate` on `[data-k-text]`.
  - When `sample` is set, the visible label reads "Sample data".
- **`parseCsv`.**
  - `parseCsv(text): Row[]` handles a header row, numbers and trimmed values.
  - Add the comment `// shortcut: no quoted commas, upgrade to d3-dsv if decks need it`.
  - JSON is accepted as an array of rows.
- **Missing data.** When `data` is null or the file is missing, the chart shows a large "DATA MISSING" box with the file name and records a problem. The TODO file is written by Task 9's Node pass.
- **Data loading.** The default media slot loads data files via `import.meta.glob('@deck/data/*', { query: '?raw', eager: true })`. This is a Task 0 seam: if the glob is not there, report it.
- **Unit tests.** `parseCsv` cases. Scale domains for each type. A waterfall's cumulative positions.
- **Fixture.** All five types, plus one missing dataset.

### Task 5: Shout-out (`shout.ts`)

- **Signature.** `shout(ctx, { question, answer, intensity: 'calm' | 'bold' })` returns four adders: `{ enter, hold, fade, answer }`.
  - **calm:** a gentle scale-in, the background dims about 30 %, no vignette.
  - **bold:** a hard entry, the background dims about 70 %, a vignette and a slow push-in during hold.
- **Default renderer wiring.**
  - Shout-out steps from the parser already have the four kinds.
  - The default renderer must call `shout` for these kinds. That edit is in `world.ts`, which belongs to Task 0. So Task 0 calls `shout` inside `safe()`, falling back to the M1 text rendering while the stub throws.
- **Fixture.** One calm deck and one bold deck.

### Task 6: World map (`map.ts`)

- **Signature.** `worldMap(ctx, { rect, sites: {id, label, lon, lat}[] })` returns `{ draw(tl), site(tl, id), arc(tl, fromId, toId), zoomTo(tl, id) }`.
  - Use the d3 `geoNaturalEarth1` projection with `world-atlas` 110m land and `topojson-client`.
  - `draw` strokes the land outline on.
  - `zoomTo` uses `ctx.camera.to` with a rect around the site.
  - Marker labels must reach ≥ 14 px at 1366 when zoomed. Labels are hidden at world zoom if too small, as decoration.
- **Unit test.** Projection of known coordinates lands inside `rect`. Each arc path starts at its from-site and ends at its to-site.
- **Fixture.** Four `[Site N]` placeholders at plausible coordinates.

### Task 7: Figures (`figure.ts`)

- **Signature.** `figure(ctx, { x, y, scale = 1, color })` returns `{ appear(tl), walk(tl, path: SVGPathElement | string, { duration }), gather(tl, x, y) }`.
  - Line-art body parts in the same style as the line art.
  - Movement uses MotionPathPlugin.
  - Limb swing is `sin(progress * steps * 2π)`, written in `onUpdate` from progress. The swing is part of the snapshot via the transform attribute.
- **Unit test.** The limb angle is a pure function of progress.
- **Fixture.** Walk along a curve, then gather three figures at a table.

### Task 8: Swarm, morph, bubbles, counters (`swarm.ts`, `motion.ts`)

- **`swarm`.**
  - Signature: `swarm(ctx, { rect, count = 2000, from: Rect, to: Rect, seed })` returns `{ stream(tl, { duration }) }`.
  - It draws on a `<canvas>` inside the world group.
  - Each frame draws `swarmPoint(seed, i, p)` for every i. That function is pure and exported.
  - It writes `data-k-progress` on the canvas.
- **`morph`.** `morph(ctx, { from: Element, to: Element })` returns `{ play(tl) }`. It moves and crossfades one shape into another, for example a document becoming a fact becoming a card.
- **`bubble`.** `bubble(ctx, { x, y, text, side })` returns `{ show(tl), hide(tl) }`.
- **`counter`.** `counter(ctx, { x, y, from, to, label })` returns `{ run(tl) }`. It uses `data-k-text` and `onUpdate`.
- **Unit tests.** `swarmPoint` is deterministic and stays inside the bounds. The counter text at p equals `round(lerp)`.
- **e2e.** The walk passes. A frame-time report logs the stream at 2000 points.

### Task 9: Media and the TODO pass (`media.ts`, `bin/todo.mjs`)

- **`image`.** `image(ctx, { href, alt, rect })` returns `{ show(tl) }`.
  - Images and GIFs load from the deck's `media/` folder via a glob URL import.
  - A missing file shows a visible "IMAGE MISSING" box with the alt text and records a problem.
- **`video`.** `video(ctx, { href, title, rect })` returns `{ show(tl) }`.
  - A local file or a direct URL uses `<video>`. YouTube and Vimeo use an iframe.
  - The video plays when its step is reached in play mode and pauses on leave or cut. The engine fires the stepper's `step` event, and `media.ts` subscribes through a `data-k-video` registry on the element.
  - The video is kept out of the snapshot via `data-k-ignore`.
  - An online video shows "needs internet" in the speaker notes. Expose it as a `data-k-note`.
- **`bin/todo.mjs`.** `writeTodos(deckDir)` scans `scene.md` files for `media/` and `data/` links. For each one that is missing, it adds a line to `media/TODO.md` or `data/TODO.md`:
  - images: `- [ ] media/x.png — prompt: <title or alt + "for a presentation scene about" + scene title>`;
  - data: `- [ ] data/x.csv — needed by <scene path>`.

  It removes the TODO file when nothing is missing.

- **Wiring.** `klappe build` and `klappe test` call `writeTodos`. That wiring is a 2-line edit to `bin/klappe.mjs`, which is Task 0's shared file, so Task 0 adds a guarded dynamic import of `bin/todo.mjs` that does nothing if the file is absent.
- **Unit test.** `writeTodos` on a temp deck: one missing image, one missing CSV, one present file. The exact TODO lines match.

### Task 10: Zoom-through and backlog (`zoom.ts`, plus files no other task touches)

- **`transitionZoom(from, to, { target })`.** The camera dives into `from`'s ref `target`, or into the frame centre, at about ×8 with a fade to black. Then `to` scales in from 0.6 to 1.
- **Backlog items:**
  - `src/ui/overview.ts`: strip `id`s from clones.
  - `src/deck/assemble.ts` `toDeckRelative`: strip the known deck-root prefix instead of cutting at the leftmost `sections/`, and add a unit test.
  - `src/parse/blocks.ts` or `scene.ts`: a blockquote between `### Q?` and its answer becomes a problem.
    - `scene.ts` belongs to Task 0. If Task 0 has merged, edit it. Otherwise report the conflict.
    - Ruling for scheduling: Task 10 starts after Task 0 merges, like all of Wave 1.
  - README: no negative or `<` offsets in step functions.
- **Fixture.** A zoom transition between two canvases.

---

## Wave 2, in parallel (demo deck, one builder per section)

Each builder owns only its own section folder under `decks/demo/sections/` and its `data/` and `media/` files. The orchestrator first sets `decks/demo/deck.md`, the section order and the `shared-canvas` groups.

| Task | Section                                                                           | Effects                                                                                                                                                                                           |
| ---- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11   | `10-opening`: old way, then boot (Example A)                                      | `shatter` (crack, crack2, fall), black hold, `crt` with spec boot lines, then `lineArt` engineer                                                                                                  |
| 12   | `20-value-stream` (Example B)                                                     | `lineArt` stream plus `iconTile` stages, `swarm` documents into Analysis, `morph` document → fact → card, `figure` walking to the customer, `bubble` Q&A, `counter` stack shrinking to 0, `shout` |
| 13   | `30-global-team`: Where we are, Coming together, Working on the topic (Example C) | `worldMap` with `[Site N]`, `figure`s on arcs, `zoomTo` the host site, then a meeting room canvas with sticky notes clustering. The room section has `transition: 'zoom'`                         |
| 14   | `40-numbers` (new)                                                                | one scene per chart type with labelled sample data, one scene with a missing CSV, one plain-Markdown scene with an image link and a video link                                                    |

- **Text.** Spec §4 text is used verbatim where it exists. New sample scenes say "Sample data" and need no facts.
- **Done means:** the walk is green at three viewports and screenshots are taken.

---

## Wave 3, alone

### Task 15: Acceptance and close-out

- **Acceptance checks.** Add AC-9 to AC-13 to the `ac` self-test mode, demo deck only:
  - **AC-9:** the shatter steps play, then back by cut shows the intact slide, and no shards remain.
  - **AC-10:** the missing-CSV scene shows "DATA MISSING", and `data/TODO.md` lists the file after `klappe test`.
  - **AC-11:** the missing image shows "IMAGE MISSING", and `media/TODO.md` holds the prompt line.
  - **AC-12:** after `zoomTo`, the host site marker is within the stage and ≥ 14 px.
  - **AC-13:** a deep link to the READY step shows all boot lines fully typed.
- **Frame-time report.** Collect the Task 1 and Task 8 reports into `docs/perf-m2.md`.
- **Docs.** README "Effects" gets one example per helper. DECISIONS gets the M2 entries.
- **Final whole-branch review.** Then finish the branch.

## Verification

- `npm test` is green: unit, lint, walk on every fixture and the demo deck at 3 viewports, and AC-1 to AC-13.
- `npx tsc --noEmit` is clean.
- The deck-repo round trip still works: `klappe init`, then `npm test` green.
- Manual checks, for the user: the shatter and the swarm at 60 fps on a laptop, and the full demo in a real browser.
