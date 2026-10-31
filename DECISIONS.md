# Decisions

Each entry: the decision and its reason. Full design: `docs/superpowers/specs/2026-10-16-klappe-design.md`.

## 2026-10-16

- **Stack: Vite + TypeScript + GSAP + D3 + markdown-it.**
  - Why: the spec stack. Cinematic camera, motion paths and charts need it.
  - npm works through px.
- **GSAP licence.**
  - GSAP is free under its "no charge" licence, but it is not open-source (not OSI-approved).
  - Accepted for internal decks.
- **Extra libraries approved by the user:** Vitest, vite-plugin-singlefile, world-atlas + topojson-client, lucide, @playwright/test.
  - Ask before adding any other library.
- **One folder per scene. Order comes from the folder-name prefix. No registry file.**
  - Why: parallel agents must not conflict on shared files. claude-advisor's script list and zone table were merge hotspots.
- **Sharing: git subtree at `klappe/` in each deck repo.**
  - Why: a plain clone works, an update is one command, and local fixes can be pushed back.
- **Images: human in the loop.**
  - Claude writes the prompt to `media/TODO.md`; the human generates the image in M365 Copilot.
  - Why: M365 Copilot has no image API. The Chat API returns text only.
- **One master GSAP timeline per canvas. Back cuts to the previous step's end state.**
  - Why: cheap, exact deep links. Effects then only need to be seekable, not reversible.
- **Build loop: an orchestrator, one builder per task, and three reviewers (technical, look and feel, content).**
  - The same loop can be used for deck building. The skill that would describe it is deferred.

## 2026-10-16 (browser driver)

- **E2E driver: Playwright's bundled Chromium (`chromium.launch()` from `@playwright/test`). No Edge fallback.**
  - Why: Edge has the policy `RemoteDebuggingAllowed=0`, so Playwright cannot drive it. The key `HKLM\SOFTWARE\Policies\Chromium` does not exist, so the bundled Chromium is not blocked.
  - The spike passed: `npx playwright install chromium` worked through the proxy, and `npm run test:e2e` passed 2/2.
  - The driver sits behind `runSelftest(url, viewport?)` in `tests/e2e/driver.ts`. A different driver can replace it without touching the tests. The Edge `--dump-dom` fallback was not ported.

## 2026-10-16 (agent discovery)

- **Claude Code does not find agents or skills in nested `klappe/.claude/`. Deck repos must sync them with `node klappe/bin/sync-claude.mjs` (deck script name: `klappe:sync`).**
  - Test: scratch repo `deck-probe/` with the klappe repo cloned to `deck-probe/klappe/`. `claude -p` run from `deck-probe/` listed no `klappe`, `klappe-builder` or `klappe-review-*` entries, with two different prompts (it listed only user and plugin skills and the built-in agent types).
  - After `sync-claude.mjs` copied the files to `deck-probe/.claude/`, the same prompt listed `klappe`, `klappe-builder`, `klappe-review-content`, `klappe-review-look` and `klappe-review-tech`.
  - The script copies only `klappe*` names and overwrites them. It leaves the deck's own agents and skills alone.
  - Not tested: `claude` run interactively (only `-p` was tested).
- **Done 2026-10-30 (was an open TODO):** the deck template's `README.md` names `npm run klappe:sync`.

## 2026-10-16 (skills deferred)

- **No klappe skill for now. The stub is removed. The four build-loop agents stay.**
  - Why: a skill written before any real deck is a guess. Skills will be written from experience (reverse-engineered from chat logs) after a few real decks exist.
  - `bin/sync-claude.mjs` still copies `klappe*` skills if any exist later.

## 2026-10-16 (M1 engine core)

- **Content-dependent e2e tests use in-code fixtures (`?fixture=two-scenes`, `?fixture=broken-step-count`).**
  - Why: `klappe test` must stay green in deck repos, where the demo deck is not present.
- **Each step is padded 1 ms before and after its content.**
  - Why: zero-duration tweens leaked into the previous step's label state on seek and play.
- **Reduced motion turns camera flights into cuts and nothing else.**
  - Why: spec §7 says camera flights become cuts. `?instant=1` is separate and seeks every play.
- **`place()` is the scene's home frame. The engine flies there on entry; `ctx.camera.to` is for moves after that.**
  - Why: one rule for entry; scenes do not write their own entry flight.
- **The acceptance suite (AC-1..8) runs on the demo deck only.**
  - Why: it checks the engine, and the demo is the one deck that is always present.
- **Deck code imports types from `klappe/types`. Deck repos map it in `tsconfig.json`; `klappe init` writes the file.**
  - Why: the same import works in the klappe repo and in a deck repo, with no relative paths into the subtree.

## 2026-10-19 (M2 fx foundation)

- **`onUpdate` may write the DOM, but only as a pure function of the tween's progress.** `onComplete` and `.call()` still must not change state.
  - Why: typing text, count-up numbers and canvas swarms need it, and a value computed from progress is the same after play and after seek.
  - The self-test snapshot records the text of `[data-k-text]` elements and the `data-k-progress` attribute, and skips anything under `data-k-ignore` (CSS loops, video).
- **The engine seeks canvas timelines with events on (`tl.seek(label, false)`).**
  - Why: GSAP's `seek()` suppresses callbacks by default, so `onUpdate` never ran on a deep link and typed text stayed empty. The walk's reset seeks to 0 the same way, so it now catches an `onUpdate` that is not a function of progress.
- **The `transition` event reports the transition that actually played.** A transition that throws (an effect not built yet, or a bug) falls back to `fade` and logs with `console.error`.
  - Why: the move must land; the log makes the self-test fail, so the fallback is never silent.
- **The default renderer falls back quietly to M1 text when the `shout` stub is not built yet.** A media step whose effect is missing shows "EFFECT MISSING: <kind>" and records a problem.
  - Why: the demo walk must stay green during Wave 1; missing media must be visible.
- **Helpers record deck problems through `ctx.problem(msg)`.** They are kept on the canvas runtime, and the self-test adds them to its problems.
- **`SectionModule.transition` is the literal union `TransitionKind` in `types.ts`; the registry must satisfy `Record<TransitionKind, Transition>`.**
  - Why: the same type as `keyof typeof registry`, but `klappe/types` stays free of imports, so a deck repo's tsc does not pull in the renderer.
- **Section text gets the size check only, and only where it overlaps the stage.** Scene text keeps both the size and the inside-the-frame check.
  - Why: a canvas-wide backdrop (stream labels, map markers) always reaches past the camera frame.

## 2026-10-19 (M2 effects and demo)

- **Transitions other than `cut` and `fade` play before the target step. A `reveal` label on the transition timeline starts the step early.** (Rulings R2, R7.)
  - Why: `cut` and `fade` keep the M1 timing, so AC-5 and the M1 feel hold. `zoom` sets `reveal` where the new canvas starts to grow, so its content grows in instead of popping in after an empty canvas.
- **No second look review for polish-only changes after a look review passed, when tests pin the look.** (Ruling R8.)
  - Why: the demo screenshots in Wave 2 catch a visual slip at lower cost.
- **The CRT count-up is opt-in per line: `{ text: "MEMORY TEST: 640K OK", count: true }`.** (Ruling R10.)
  - Why: a line that counts because a regex matched it is hidden magic. A count line that does not match the pattern is a deck problem, not a silent plain line.
- **A shatter step may seek its canvas timeline to the current end at load, copy and measure the target there, and seek back.** Transitions may create overlay DOM at play time. (Ruling R12.)
  - Why: the shards must show the target as the deck shows it at that step, including text written from `onUpdate`. Step adders run at load, so "all DOM exists at load" still holds. Transition timelines are standalone and never seeked; a back move is a cut.
  - AC-9 tests the in-scene shatter. The back cut across the shatter transition is covered by `tests/e2e/fx-shatter.e2e.test.ts`.
- **The `zoom` transition scales the layer that holds all canvases, never the target canvas's own transform.** (Ruling R13.)
  - Why: the camera stays the only owner of a canvas pose, so the target step can fly the camera while the canvas grows in.
- **"Sample data" shows only for the explicit marker: `source: klappe demo sample` in the data, or `sample: true`.** (Ruling R14.)
  - Why: matching the word "sample" anywhere would label real data as sample data.
- **The demo deck walks clean: zero problems.** AC-10 and AC-11 (missing data and image, the TODO files) run on the fixture deck `acceptance-todo`. (Ruling R16.)
  - Why: a red problems panel in the showcase deck contradicts "a deck walks clean" and would make every deck-level test meaningless. The fixture also keeps AC-10 and AC-11 green in deck repos.
- **AC-8 starts auto-play 3 steps before the end.** (Ruling R18.)
  - Why: the demo grew to 53 steps; from step 0 auto-play cannot reach the end within one check's 8 s budget. The check still proves that auto-play reaches `end`, stops by itself, and stops on manual input. Auto-play through the long scenes is covered by the walk.
- **The `onUpdate` rule (see M2 fx foundation) held through M2.** CRT typing, the counter and the swarm canvas write the DOM from `onUpdate` as a pure function of progress, and the walk checks play against seek for each of them.
- **A video box has a theme-token border and its title as a caption underneath.**
  - Why: offline, a bare black box reads as a hole in the slide. The caption sits outside `data-k-ignore`, so the self-test checks its size.
- **A background is pinned to the screen: one cover image per background, in a layer under the world, so the camera moves the content over a still picture.** The user chose this on 2026-10-20; it replaces one copy per scene frame. A scene's own background cross-fades with the section's over the camera flight. The first scene's background shows from load and fades in with its canvas. Ken Burns runs once per background, from the first scene that shows it. Transitions move the canvas (pinned layer and world together): the zoom dives the whole canvas, the shatter breaks it.
  - Why: with one copy per scene frame, a flight between two scenes that share a background showed a hard seam between the copies, each at a different Ken Burns pose.
- **A full-frame picture's `show()` starts at its step's start, not after the camera move.** `appendStep` moves a `step` label to each step's start while it builds the step; `image()` reads it when it has no `at` and fills the scene frame (fit cover, no rect). Its `show()` fades in over `motion.camera` with an ease-in (`power2.in`); its `hide()` fades over `motion.step`, like any other hide.
  - Why: a cover that fades in after the camera lands leaves a bare frame for the whole flight. A rect'd image and the default renderer's media keep their old placement. The label is read at build time only, so play still equals seek. The long ease-in fade keeps the picture faint while it slides in with the world (the default ease-out had it near 80 % mid-flight); at full opacity its hard edge wiped across a pinned background behind it. A camera-length hide made plain hides with no flight 2.7x slower.
- **Text on a picture needs a scrim of 0.6 or more.**
  - Why: theme text (`--k-fg`) over pure white under a black scrim of 0.55 measures about 4.0:1; 0.6 reaches 4.5:1. The e2e test checks it over a picture with white dots under the text.

## 2026-10-20 (M3)

- **Themes are CSS token files; Shiki approved 2026-10-20.**
  - A theme sets `--k-*` on `:root`; `calm.css` always loads first, so partial themes fall back to calm. Lookup: deck, repo, built-in.
  - Why: decks and repos can restyle everything without code, and the contrast check turns a bad palette into a deck problem.
  - Shiki (css-variables theme) maps syntax colours onto `--k-code-*` tokens.
  - Theme CSS is imported with `?raw`, not `?inline`: vitest blanks `?inline` CSS, and plain theme files need no CSS processing. `vitest.config.ts` lets the unit project read `src/themes/*.css`.

## 2026-10-24 (single-file build dropped)

- **No single-file build. The deck ships as the static Vite build (`klappe build`), served over http, for example from GitHub Pages.**
  - Why: the user dropped the feature. The static build with relative asset URLs already works from any folder on a web server.
  - So `file://` is not supported: ES modules do not load from it, and the speaker channel's `file://` case needs no work.
  - `klappe build` does not fail on deck problems: it runs no browser. `klappe test` fails on them, and CI runs the tests before it deploys.
  - `vite-plugin-singlefile` is no longer needed.

## 2026-10-24 (reduced motion)

- **Reduced motion also turns the `zoom`, `crt` and `shatter` transitions into a fade.** It replaces "reduced motion turns camera flights into cuts and nothing else" (M1).
  - Why: the dive, the flash and the falling shards are the most intense moves in a deck, the ones a reduced-motion viewer most wants gone. `?reducedmotion=0` keeps them for a presenter whose laptop asks for reduced motion.

## 2026-10-24 (versions)

- **Semantic versioning, from 0.3.0. `package.json` holds the version; `CHANGELOG.md` lists every change; a release is a tag `vX.Y.Z` on `main`.**
  - Why: deck repos pull klappe as a subtree and need to know what an update changes. `1.0.0` was the npm-init default, not a release.
  - 0.x while the deck format, the `scene.ts` API and the CLI still change; a minor version may break, and says so under **Changed**. 1.0.0 with the deck template (M4).
  - Back-filled: 0.1.0 = M0 and M1, 0.2.0 = M2, 0.3.0 = M3 (`main` on 2026-10-24).
  - Release steps: move **Unreleased** under the new version and date, bump `package.json` (and the lockfile), merge, tag the merge commit, push the tag.
## 2026-10-20 (mesh3d)

- **A helper that runs by itself (`mesh3d`) draws on its own `gsap.ticker` loop and pauses when hidden. There is no scene-leave hook.**
  - Why: klappe has no event for "the scene is left", and a deep link or jump can skip any step that would stop the loop. So each frame first reads the computed `visibility` and `opacity` of the root. A hidden root, or a hidden canvas above it, costs one style read and no drawing. A mesh not yet shown draws nothing.
  - The step state (form, colour, speed, collapse) is a plain object that only the timeline tweens, with `fromTo`. The loop reads it when it draws, so a seek lands on the right look. The turn angle and the random life live on the loop and are not seekable; the root has `data-k-ignore`, so the self-test skips them.
  - `destroy()` removes the loop and the canvas, for a deck that wants to clean up. A scene-leave hook in the engine would replace the visibility check; that is a decision for the klappe owner.

## 2026-10-20 (crt prompt lines)

- **`crt` prompt lines are declared up front: `crt(ctx, { lines, prompts })`, then `prompt(tl, index, { cps, at })`.** Each prompt row and the row after the last prompt has its own cursor block; `prompt()` hides one row's cursor and shows the next one's, so no element moves or changes `display`.
  - Why: `build()` creates all DOM, hidden (scene.ts rule). A `prompt(tl, text)` adder would have to create DOM at step time. `fitFont` counts the prompt rows, so 7 boot lines, READY., 2 prompts and the cursor row keep 46 px.
- **`cursorAt()` is arithmetic from the layout constants, not a DOM measure: the block's centre on the row after the last prompt.**
  - Why: another helper reads it in `build()`, before any prompt has typed. The gallery check measured 2 px from the rendered block.
- **`settle(tl)` shows the root and the screen and plays only `powerOn`'s 1.1 s brightness settle.** `powerOn` and `settle` share one tween.
  - Why: after the `crt` transition flashed the line, a second beam from `powerOn` repeats it. Decks no longer set `.k-retro` and `.k-crt-screen` themselves.

## 2026-10-20 (deck.css)

- **A deck may bring `decks/<id>/deck.css`. `src/deck/files.ts` imports it with `import.meta.glob("@deck/deck.css", { query: "?inline", eager: true })` and appends it as a `<style>` after the klappe styles. Fixture decks skip it.**
  - Why: `?inline` runs the file through Vite, so `url()` resolves against the deck folder and the build bundles fonts and images. A plain CSS import would also apply to `?fixture=` decks, so a corporate `--k-font` or `--k-fg` could break klappe's e2e checks in a deck repo. No deck.css means an empty glob: nothing changes.
  - The design lint now scans `.css` under `decks/`. klappe has no single-file build yet; when it comes, it must inline these assets too (raise `build.assetsInlineLimit`).

## 2026-10-20 (auto advance)

- **`SceneModule.auto` holds one number of seconds or `null` per step. After a live forward play of that step, the stepper waits that long and calls `next()` itself.** `buildStepList` copies the value onto `StepAddr.auto`; the stepper arms one timer after the step's animations (and a canvas transition) end.
  - Why: the stepper is the only place that knows the move was a live play (not a seek), that it has finished, and that no press is queued. A deep link, jump, back move, overview or selector pick, history move and `?instant=1` are seeks, so they never arm the timer. A chained advance is a normal `next()`, so the router, the speaker view and the transition behave as on a press.
  - Every move (`next`, `prev`, `goto`) clears the timer first, so a press during the wait advances exactly one step. Opening a panel does not clear it.
  - Reduced motion does not stop it: the advance is flow, not decoration.
- **Autoplay owns the advance while it runs. It holds a step for its `auto` time when the step has one, else for `autoHoldMs`, and clears the stepper's timer each round.**
  - Why: two timers would advance twice.

## 2026-10-20 (countdown)

- **`countdown` runs on `gsap.ticker` like `mesh3d`: root `data-k-ignore`, no update while hidden, `destroy()`. A `minutes` count starts on the first visible frame.**
  - Why: the time left depends on the wall clock, not on the timeline, so play and seek cannot agree on it. There is no step-enter hook, so the first visible frame stands in for "the step showed it". A hidden countdown does not start.
  - `remaining(nowMs, target)` is a pure function for the unit test. It rounds a part second up, so `0:00` shows only when the time is over, then holds there.

## 2026-10-20 (bubble layout, mesh3d idle, panels stop auto)

- **`bubble` takes `maxWidth` and the vertical sides `top` and `bottom`. `left` and `right` keep their old meaning (where the bubble sits). `top` and `bottom` name the edge with the tail, so `top` puts the bubble below the point.**
  - Why: the deck plan asks for "side top: the tail on the top edge", and old callers must keep working. The mixed meaning is the cost; `bubbleLayout` holds the table.
- **`mesh3d` reads no computed style per frame. A `visible` flag, set from the progress of the `show` and `hide` tweens, and `form` gate the draw.**
  - Why: a style read each frame on every mesh cost layout work while idle. The flag follows seeks, because it comes from tween progress.
- **Opening the overview or the section list cancels a pending `auto` advance.**
  - Why: the deck must not move under an open panel. The stepper sets the timer after the play ends, so `cancelAuto` bumps a counter; a move that was queued or playing at a cancel sets no timer.
- **The stepper marks the active canvas root (`.k-canvas`) with `data-k-active`. Self-running helpers (`mesh3d`, `countdown`) find that root once at build and draw only while it has the attribute.**
  - Why: Day 1 has about 15 mesh scenes, and a shown mesh on another canvas kept drawing. One attribute read per frame is cheaper than a computed-style read and covers every hidden canvas. The new canvas gets the mark when the move starts (it draws during its transition in); the old one loses it when the move ends. The countdown dropped its 200 ms computed-style throttle for the same mark plus a show/hide flag.

## 2026-10-21 (replayed deck helpers onto M3; countdown folded into timer)

- **The 11 deck-helper commits of `feat/deck-helpers` were cherry-picked (`-x`) onto M3 `main` as `feat/deck-helpers-m3`.** 701d3b6 and 8dfe718 are one commit: only 701d3b6's own files, without its accidental revert of the video fallback.
  - Why: main's history was rewritten, so the old branch shares no commit with it. The README hunks of the old commits went to `docs/reference/` instead (deck-format.md, `elements/crt.md`, `elements/bubble.md`, `elements/mesh3d.md`).
- **`countdown` is gone. `timer` takes `until: "HH:MM"` as the other choice to `minutes` (user decision).** An `until` timer runs whenever its step is in view, `T` does nothing to it (a click on it steps the deck, as anywhere), it never goes negative, and at zero it shows "Time's up" in `--k-bad`. Its ring and warn phase measure from the time left when the step comes into view. `minutes` works as before.
  - Why: two wall-clock elements would duplicate the clock, the styles and the done state. The 2026-10-20 countdown entry above describes the old helper.
  - Lost from countdown: `h:mm:ss` over an hour (the timer shows `m:ss`, for example `75:00`) and the "careful" orange at zero.
  - A bad option (both, neither, or an `until` that is not `HH:MM`) is a deck problem, not a throw, as for the other elements.
- **`decks/<id>/deck.css` stays. A theme holds tokens only; deck.css holds fonts and component classes, and it may override tokens.** `applyTheme` moves the deck.css `<style>` after the theme's, before the contrast check reads the tokens.
  - Why: the theme loads after `loadDeck()`, so without the move the theme won over deck.css at equal specificity.
- **`mesh3d` mood colours stay fixed hex. The design lint exempts `mesh3d.ts` from the colour-literal rule, like `crt.ts` and `media.ts`.**
  - Why: a mood is part of the story (calm, curious, careful), not of the look, so a theme must not change it. `bubble` already takes `--k-accent`, `--k-bg` and `--k-fg`. The `crt` preset `teal` (#009A9B) stays a named preset; no teal token exists, and `color` takes any CSS colour.
- **The demo deck shows `mesh3d` in "Your turn" (process training), for the coverage lint.** Gallery `140-mesh3d` became `230-mesh3d`, because M3 uses 140 for code.

## 2026-10-24 (bundle size)

- **Only the Lucide icons a deck names are bundled.** A Vite plugin (`bin/scan-plugin.mjs`) reads the deck's code at build time and keeps the string literals that are Lucide names; `icon()`, `iconTile()` and flow nodes also take the icon itself (`import { Rocket } from "klappe/fx/lucide"`).
  - Why: the full icon set was 415 KB of the demo's 1.19 MB main chunk. Keeping string names keeps every existing deck and the skill's examples working; a name built at run time reports a problem instead of failing silently.
  - Over-matching is harmless: a word such as `"check"` that is also an icon name adds a few hundred bytes.
- **An async start loads what a deck may not use.** Before the world renders, `main.ts` awaits the Markdown parts the `scene.md` files use (shout, checklist, agenda, chart with d3, terminal), Shiki when the deck shows code, and the `zoom`, `shatter` and `crt` transitions its sections name. The self-test loads only for `?selftest=`, the test fixtures only for `?fixture=`.
  - Why: build stays synchronous (the timeline rule: DOM and SVG exist at load), so loading has to finish before it. Deck code still imports effects statically; the bundler drops the ones it never imports.
  - Shiki is needed for a code fence or when deck code imports `code`; the build scans for that import (`virtual:klappe-fx`), because a call cannot be seen before build runs.
  - Result: a Markdown-only deck loads 218 KB of JS at start instead of 674 KB; the demo, which uses every effect, loads 537 KB at start plus Shiki.

## 2026-10-24 (bundled fonts)

- **klappe bundles its theme fonts: Inter (calm), Space Grotesk (bold) and JetBrains Mono (code and terminal, both), as `@fontsource-variable` npm packages.**
  - Why: effects measure text while they build, so the system font made layout differ between the presenter's laptop, CI and the PDF export. Bundled, the deck needs no font CDN and works offline.
  - Variable fonts, so a deck can tween the weight; all three have fixed-width digits, set on the stage, so counters, timers and scrambles do not jitter. Code has ligatures off: `<=` reads as typed.
  - `main.ts` awaits `document.fonts.load` for the faces `--k-font` and `--k-font-code` name before the world renders; only the subsets the text uses download.

## 2026-10-24 (glow, pulse and shake)

- **`glow` is a blurred layer behind the target whose `opacity` alone tweens; the blur is fixed at build. It takes a token name (`color`, default `--k-accent`), so `lineArt().glow` keeps its warm `--k-warn`.**
  - Why: tweening `filter: drop-shadow` repaints the element every frame (`docs/perf-m2.md`). An HTML target gets a box before its top-level element in the scene, so DOM order paints it behind; an SVG target gets a copy of itself, because the HTML layer paints over all SVG.
  - `breathe` loops on the wall clock (Web Animations, on a leaf under `data-k-ignore`, as the crt blink does), not as a finite repeat on the timeline: a live marker must not stop after N breaths, and a long repeat would hold up auto-advance. The timeline only fades its layer in and out, so seek still equals play. With reduced motion the loop does not start.

## 2026-10-25 (deck tooling)

- **The timeline lint flags only `from()`; a `fromTo` without `immediateRender: false` is left to the walk.**
  - Why: the demo has twelve such tweens whose start is the load state, and GSAP's default writes that state at load, as a seek back writes it. Adding the flag there without a `gsap.set` in `build` broke play = seek in the walk at every size. A static check cannot tell a start that is the load state from one that shows early.
- **`klappe outline` parses the deck in Node through Vite's `runnerImport`, without a browser and without the scene modules.**
  - Why: the steps, notes and titles all come from `scene.md`, and the TS parser is the one the browser runs, so the outline cannot drift from the deck. Loading `scene.ts` would need the DOM.
- **`klappe shot` and `klappe pdf` share `openDeck` and `showStep` (`bin/pdf.mjs`): `?instant=1&reducedmotion=1`, no UI, a cut per step, fonts and one painted frame awaited.**
  - Why: the agents wrote their own Playwright scripts for every review, each a little different. With reduced motion, moving backgrounds hold their first frame, so a shot is the same on every run.

## 2026-10-25 (gitGraph, semanticZoom, state machine, transition gallery, scatter)

- **`gitGraph` takes the whole history as `ops` in `build` and plays one per `next`; a rebase makes new commits (`label′`) that fly from the originals, which fade.**
  - Why: the layout must be fixed before the first step (seek equals play), so the columns for a rebase's copies exist from load. Copies, not moved originals, because a rebase rewrites the commits; the prime says so on screen.
- **`semanticZoom` sizes each level's labels for the camera on its parent and moves one level per `into` or `out`; leaving a level fades it.**
  - Why: text hidden at a zoom where it would be under the floor, and text off the stage, would fail the walk's legibility check. One level per step keeps that true at every settled step and gives the speaker one thing to say per press.
- **A state machine is `flow` with `fire(from, to)` and self-loop edges, not a new `stateMachine` element.**
  - Why: states and transitions are boxes and arrows on a grid, and `highlight` already rings the current one. A second element would duplicate the layout, the routing and the label fitting. Each `fire` draws its own accent copy of the edge: drawing one shape on twice breaks a step back, since GSAP renders the second draw's start when it rewinds past it.
- **The transition gallery is one section per kind, all from one factory (`decks/demo/shared/transition-card.ts`).**
  - Why: a transition plays only between canvases, so it cannot live inside one section. Every card carries the same `data-k-match` key, so the `magicMove` card visibly flies the name instead of looking like a fade.
- **`scatter` and `bubble` are `chart` types; the time column is found by name (`period`, `year`, `date`, `month`, `quarter`, `week`).**
  - Why: they share loading, the data checks, the title, the sample label and the source note with the other types. A year column holds numbers, so it can only be told apart from a series by its name.
- **The speaker profile is a demo factory to copy (`decks/demo/shared/speaker-profile.ts`), not a `klappe/fx` effect.**
  - Why: it only lays out `image`, `qr` and `text`, and every deck wants its own arrangement and house style. A fixed effect would grow an option per taste; a copied factory is edited in place.

## 2026-10-26 (review mode)

- **Review findings are saved through a dev-server route (`bin/review-plugin.mjs`), one step and only its changed categories per write.**
  - Why: the browser cannot write the deck folder, and the author reviews on the dev server anyway. Writing one step's changed categories means a save never brings back a finding Claude removed meanwhile, nor overwrites another step.
  - The route takes only the deck's own origin: any page the author visits can reach localhost.
  - Each save carries its window's id and a growing number; the route skips a category that a newer save from that window already set on that step. Why: a closing window sends its last saves at once, beside one still in flight, and they land in any order. Per step and category, so a late save never drops another category's or step's text.
- **Review mode exists where its route does: the plugin defines `import.meta.env.KLAPPE_REVIEW`, not `import.meta.env.DEV`.**
  - Why: a build made in a test run reports `DEV` true; the real condition is whether a server can save the file.
- **Findings are keyed by deep link, which is a position; a skill rule and the quote guard it.**
  - Why: a stable step id would need authors to name steps. Claude rewrites the links of open entries when it changes a scene's step count and works a scene from its last step; the review window shows "Written for" when an entry's quote no longer matches its step.

## 2026-10-27 (roadmap rush)

- **`roadmap` ticks every 2 or more months count from January, not from the axis start.**
  - Why: an axis from March with a 6-month stride showed "Mar 2020, Sep, Mar, Sep, …": the year was on the first tick only. Counted from January, every January has a tick with its year. The cost: an axis whose first month is off the stride has no tick at its left end.
- **`rush(from, to)` is a handle step on `roadmap`, not a new effect.**
  - Why: it reuses the axis, the milestones, the accent and its settle; only the timing and the pop are new. With reduced motion it keeps the shrinking gaps, since they are the message, and drops the pops.

## 2026-10-28 (agent speed)

Source: an analysis of the session logs of the training deck build: full test runs, ad-hoc screenshot scripts and permission prompts took most of the agents' time.

- **`klappe test --only` plays each run of picked steps on from a cut to the step before it, not from the deck's first step.**
  - Why: a play from the start takes as long as the full walk. The cut is what the full walk checks (seek equals play), so the filtered walk trusts it; the full walk before a merge still covers it.
- **No lock file keeps two full `klappe test` runs apart; the rule is in the skill and the agents: only the orchestrator runs the full walk, once per wave.**
  - Why: most agents that ran tests were killed mid-run, so a lock file would go stale and block the next run.
- **`shot --at` seeks the step's canvas timeline; it does not play and wait.**
  - Why: a seek gives the same picture each run, on a busy machine too; seek equals play, so it is the picture the room sees.
- **The look report is the walk's warnings, printed by `test --only`, not a new check in `shot`.**
  - Why: the walk already measures the safe area and clipped text; a second copy in `shot` would drift.

## 2026-10-28 (review states, wake lock)

- **A finding's state is the last of its `#### Fixed` and `#### Reopened` sections in `review.md`, not a flag or a second file.**
  - Why: Claude and the author both read the file as text, and the history (what was fixed, why it came back) is what a reviewer-recall eval needs. The window escapes a typed `#` line, so a finding cannot fake a state. Approve and reopen apply only to a finding still fixed on disk, so a stale window cannot approve one Claude has reopened or rewritten.
- **The deck window always asks for a screen wake lock; there is no flag to turn it off.**
  - Why: a deck page is open to be presented, and the browser drops the lock when the tab is hidden. No fallback for pages without `navigator.wakeLock` (plain `http` from another host): the dev server and an `https` host have it.

## 2026-10-28 (tooling)

- **The demo steps the acceptance checks use are one `DEMO` list in `src/selftest.ts`, and a lint (`tests/lint/deep-links.test.ts`) checks every demo deep link in it, the author docs, the skill and the agents.**
  - Why: a moved story scene broke checks and docs that only a repo-wide search found. The lint reads the demo's Markdown, so it runs in the fast unit pass. Unit tests that build their own steps (`router`, `scene`) are not tied to the demo and stay as they are.
- **No scaffold script for a new effect option.**
  - Why: an option's real cost is its content (the catalog scene that shows it, the reference row that explains it), which a script can only stub; the stubs would then have to be caught. The intent-table row is only for new exports, and the shared `fx-options` fixture and e2e file save the other two files.
- **No test helper for a scene's elements in both layers.**
  - Why: `[data-scene="x"] .child` already matches in both; only the scene root itself needs its layer named (`div[…]` or `g[…]`), which the e2e tests already do. The builder agent's brief says so.
- **Reopened review findings become eval cases by hand, from a recipe in `evals/README.md`, not by a generator.**
  - Why: no deck has a reopened finding yet, a fix commit's files do not apply cleanly over a later `HEAD`, and a generator could copy confidential deck content into this public repo.

## 2026-10-28 (new effects)

- **`formula` uses KaTeX, not MathJax, and loads it only for a deck whose code imports `formula`.**
  - Why: KaTeX renders synchronously, so the formula is built at load like every other effect, and it is several times smaller. It loads the way Shiki does for `code`, through `loadParts`, so a deck without formulas never fetches it. Version 0.19, not 0.16: the older one has an advisory on prototype pollution bypassing `trust`, which `\step` relies on.
- **`\step{…}` is a KaTeX macro for `\htmlClass{k-ft}{…}`, and `trust` allows only that command with that class.**
  - Why: marking terms in the TeX keeps the formula in one string an author can read. Trusting only the one class keeps a deck's TeX from adding links, ids or styles.
- **A formula's font floor is 30 px, not the 20 px of other text.**
  - Why: KaTeX sets sub- and superscripts at 70 %: at 30 px they are 21 px, at the legibility floor; at 20 px they would be 14.
- **Process steps, mind map and fishbone are their own elements, not modes of `agenda`, `flow` or `decisionTree`.**
  - Why: `agenda` rows need times and stack vertically; `decisionTree` needs an edge label on every link and builds by level, top down. A mode would have bent both APIs for one layout each. They reuse the house patterns instead: the accent overlay and step-order bookkeeping of `pyramid`, a pure layout function with a unit test.
- **The heatmap's `cell()` moves one outline, and the treemap's tiles stay in data order.**
  - Why: one outline is one element to tween, from where the steps before left it, so seek equals play. Data order keeps `bars` and `bar(i)` meaning the same row for every chart type; the layout places the tiles largest first.

## 2026-10-28 (video on a clicker)

- **An embedded YouTube or Vimeo player starts on its step by default; `autoplay: false` opts out.**
  - Why: a presenter with only a clicker cannot click into a player, and a local file already played on its step. The step key is a user gesture, so the browser lets the start through, with sound: a clip in a talk is there to be heard. `muted: true` keeps one silent. A deck window stepped only from the speaker view has had no gesture of its own, so a browser may block the sound there until the presenter clicks into it once.
- **`play(tl)` is a step adder on the video handle, not an option.**
  - Why: "show it, talk, then start it" is one more click, which is a step. The handle keeps one start time that the last `show` or `play` set, read when the steps play, so there is still one listener and one stop rule: any step change stops the video.

## 2026-10-28 (effect improvements)

- **`callout`, `glow` and `pulse` measure their target at the timeline's current end (`atEnd` in `measure.ts`), as shatter does (R12).**
  - Why: a target an earlier step moved (a code line after `diff`, a box tweened aside) was measured where it sat at load. Seeking to the end and back is pure: every effect writes from progress.
- **Arrow routing round boxes lives in `src/fx/route.ts`, shared by `flow` and `swimlanes`, though the two otherwise keep copies of each other's code.**
  - Why: the detour and lane spreading are one algorithm on grid channels; two copies would drift. It is not an element, so the "no imports across element files" rule holds.
- **The walk counts text an ancestor's overflow cuts away whole as unseen.**
  - Why: a page scrolled in its window (`pointer.scroll`) has text below the window that nobody sees; flagging it as outside the stage was a false positive. Text cut in part is still a clipped-text look failure.
- **`pointer` has no hover; an HTML glow still covers SVG lines next to its target.**
  - Why: a hover state belongs to the product shown (a tint, a tooltip, a menu), so a generic one would mislead. The glow sits in the HTML layer above `ctx.svg`; a blend mode would only fix it on dark themes.
- **A Markdown failed check is `- [!]`.**
  - Why: GitHub task lists have no fail state; `[!]` reads as "problem" and leaves `[ ]`, `[x]` untouched.

## 2026-10-28 (test speed)

- **The whole-deck walk runs in parts of whole sections (`&part=k/n`), each in its own browser, up to four at each size.**
  - Why: it was the slowest test (45 s at each size here, 85 s on CI). A part starts from a cut to the step before it, as `--only` does, so state a full play-through carries across a part boundary is not checked there; within a part, and at every section boundary inside it, it is. The part count is `availableParallelism() / 6`, rounded down and capped at 4, so CI's 4-core runners still walk it whole.
- **E2e workers are half the cores, at least 6.**
  - Why: on 28 cores, 14 was fastest (20 was no faster, 27 crashed a renderer); 6 is what CI's runners always ran.
- **The deck's eager globs live in `src/deck/files.ts`, which `loadDeck` imports only without `?fixture=`; fixtures load lazily.**
  - Why: Vite hoists an eager glob into a static import, so every fixture page loaded the whole demo deck and all fixtures: 782 requests where 148 do. A built deck gets one more chunk. The page's load event now fires before the deck is in, so a test waits for `klappe.stepper` or `klappe.speakerView`, never for load.
- **`noUnusedLocals` is on; no ESLint.**
  - Why: the stricter tsc flags found 17 unused imports (fixed) and nothing else worth a rule; `noUncheckedIndexedAccess` gave 1645 findings. typescript-eslint's promise rules (`no-floating-promises`, `no-misused-promises`, `await-thenable`), tried with TypeScript 6 on 2026-10-28, gave 41 findings and no bug: GSAP timelines are thenables, so every `forEach((x) => tl.to(…))` is flagged, and a step started without `await` already fails the walk through `unhandledrejection` (`src/errors.ts`). typescript-eslint also cannot run on TypeScript 7, which has no JavaScript API.

## 2026-10-29 (effect additions)

- **`chart.to(column)` moves between number columns of one file, named up front in `columns`; it does not take a second dataset.**
  - Why: the same rows, labels and checks hold for both states, so `to` only tweens values. Naming the columns up front lets the value axis span them all at load (a bar compares across the step, as in `barRace`); widening the axis to every number column by default would have shrunk existing bar charts whose files carry unused columns. Only `bar` and `donut`: a `line` already draws every column as a series.
- **`parseCsv` keeps the header's column order on its result (`keysOf`).**
  - Why: JS lists object keys that look like integers first, so `team,2024,2025` made `2024` the label column. Rows passed as `data` still have their object's order; a file is the fix there.
- **`spotlight` dims with one layer cut by an even-odd `clip-path` with four holes, not a box-shadow round one hole.**
  - Why: a second shadow covers the first hole. A path of a fixed shape (unused holes shrunk to a point) tweens as one string, so a step from one hole to two is one tween that seeks.
- **`formula` numbers each `\step` by its place in the source and builds in that order.**
  - Why: KaTeX puts a fraction's denominator before its numerator in the DOM, so the terms built out of the order they were written. `trust` allows exactly the class pattern `k-ft k-ft-<n>`, still nothing else.
- **`mindMap.light(i)` dims the other branches; it does not put the branch in the accent.**
  - Why: each branch's series colour is its identity across the map. Each branch is one group dimmed as a whole, so a dimmed box never shows its own lines through it.
- **A Markdown table is always a `compareTable`, one row per step.**
  - Why: the table is how people write a comparison; ✓ ✗ ~ map to the marks. A table for other data still has `scene.ts`.

## 2026-10-30 (1.0.0 scope)

- **1.0.0 ships with every entry in `docs/backlog.md` built, not with the deck template alone (was: "1.0.0 with the deck template (M4)", 2026-10-24 versions).**
  - Why: 1.0.0 freezes the deck format, the `scene.ts` API and the CLI. The backlog holds changes to all three (type scale, text steps, frame size, overlay layer, own transitions); freezing before them would put each behind a 2.0. The API audit against the three work decks comes first and may drop entries before they are built.
- **Sound is in scope; the design spec's v1 non-goal "Audio and narration" is lifted.**
  - Why: sound is the largest cinematic gap. It plays on forward steps only, like video, so seek still equals play; it is opt-in per deck and muted by a key, for rooms with bad audio.

## 2026-10-30 (API audit picks)

- **Parking a scene or section is a `_` folder prefix, not a `skip: true` key.**
  - Why: `scene.md` and `section.md` have no frontmatter; a prefix needs no new parsing, keeps the parked `scene.ts` out of the build (so a half-written one cannot break the deck), and reads in a file listing.
- **The type scale is three tokens, and effects follow them by ratio, not by snapping to three sizes.**
  - Each literal size becomes its role's token times its old share of the default (a 26 px label is 26/28 of `--k-size-label`). The roles: 32 px and under a label, 33 to 60 body, 64 and up a title.
  - Why: at the defaults every effect looks exactly as before, so no deck changes; a theme that raises a token raises every size of that role in proportion. Snapping would have changed most effects' looks at once.
  - Legibility floors (20 px) do not scale. `crt`, `timer` and `map` keep their own sizes: those come from fixed geometry (the CRT screen, the dial, the world zoom).
  - The tokens are read from `:root` once per page; a token set on a scene or section element does not reach the effects.
- **A container option on effects was not added (the audit's proposal 3).**
  - Why: it would be one option on about 70 effects, frozen at 1.0, for 20 files in one deck. Passing a context with another parent, `{ ...ctx, html: box }`, already works and is documented as the way.
- **`show` and `hide` take a GSAP position (`at`) but keep `to`, not `fromTo`.**
  - Why: the work deck wrote its own fade for the position. A `fromTo` from 0 would flash an element that is already visible; `to` with the element built hidden already keeps seek equal to play.
- **The overlay layer is `overlay.ts` with `build` and `update(at)`, not deck.md keys and not timeline steps.**
  - Why: the work deck's frame helper (logo, brand frame, title) needs code, so keys alone would not replace it, and keys beside a module are more API to freeze. `update` gets the step it lands on and sets the overlay from that alone, so it needs no timeline of its own and a jump shows what a play does; the walk compares it with the canvas.
  - It is under the UI and outside the look checks: its ink sits in the margin that `safe-area` keeps scenes out of.

## 2026-10-30 (next picks)

- **A Markdown shout-out is two steps (question, answer), not three (was: enter, fade, answer).**
  - Why: the work deck wanted two in all five of its shout-outs and padded the third with an empty step and an `auto` of 0. The fade beat was a click on a dimmed, almost blank frame; a presenter pauses on the question anyway. `fade` stays on the handle for a `scene.ts` that wants the beat.
- **The starter deck is a `template/` folder, shaped by the work decks, and sets `max-words: 12`.**
  - Both audited decks grew `data/` and `media/`, the bigger one also `shared/` and `deck.css`; both set the same five `deck.md` keys. The template has those, one scene, and a README with the commands. It has no example `scene.ts` or `overlay.ts`: an agent copies catalog scenes instead.
  - The word cap is on from the first scene, so a long step fails `klappe test` before a deck grows around it; the README says how to raise it.

## 2026-10-31 (backlog top five)

- **Plain text steps replace each other by default; `stack: true` in `scene.md` frontmatter opts into the build-up.**
  - Why: the bullet build-up slide is what klappe is meant to replace. One large statement at a time is what a talk wants, and an agent writing plain list items now gets it without a `scene.ts`.
  - Only a scene of plain items replaces. With media, code, a task list, a table or an agenda, the text is a caption column beside the element, and a large centred statement would sit on top of it.
  - The switch is frontmatter in `scene.md`, the first scene-level key there. Composition presets and the story point are planned as scene frontmatter too, and a plain scene has no `scene.ts` to hold an option.
- **`frame` in `deck.md` picks one of four shapes (16:9, 4:3, 1:1, 9:16), not any size.**
  - Why: a free size would be an API to freeze for shapes nobody asked for; these four cover a projector, an old room, a social square and a vertical video. Landscape frames keep 1080 scene px of height and a vertical one 1080 of width, so `--k-size-*` and the 20 px legibility floor mean the same in every frame.
  - The stage size is one module-level object in `theme.ts`, set once at load like `tempo`. Effects read it when they build, not at import, so nothing else had to pass it around.
  - Effects and scene code keep their scene-px coordinates: a 16:9 scene is not rescaled into another frame. A deck picks its frame before it is written.
- **Review edits name an element by its effect and text, not its call site.**
  - The spike: Vite reprints `scene.ts` before the browser runs it (a `chart()` call on source line 7 runs on line 4), so a stack trace's line does not point at the source. Mapping it back needs the inline source map and a VLQ decoder in the page, for a hint Claude can get from the effect and text in a moment.
- **A review edit is a line in `review.md` that Claude applies, not a write into `scene.ts`; only `scene.md` text is written straight back.**
  - A position in `scene.ts` is code (a loop, a helper, `place()`, an earlier tween); only a reader can tell which number to change. A `scene.md` line is the text itself, so it is written when it is on exactly one line, and refused otherwise.
  - The deck window sends the line over the speaker channel and the review window writes it into its Visuals field, so `review.md` keeps one writer and its save queue.
  - The preview uses CSS `translate` and `scale`, which compose with GSAP's `transform` and leave the timeline alone; the next step puts back only those properties.
- **`svg` is a new effect beside `lineArt`, not a mode of it.**
  - `lineArt` is a line drawing that forces every stroke to `--k-fg`; full-colour art keeps its fills and maps them. Their options and steps differ (layers by id vs one draw), so one function with a mode would carry both sets.
  - An unmapped colour stays in its own colour and is a deck problem, not a silent `--k-fg`: the author sees which hex value needs a token.
  - Layers are the top-level ids only, hidden at load, so the hidden state is known in `build` as the timeline rule asks. Exporters give an id to every group; making all of them layers would hide the whole picture.
- **Camera pacing is a `camera` key on the scene being entered, not on the section or the deck.**
  - A flight's character belongs to where it goes: a whip into the far scene, a slow push into the one that matters. `tempo` stays the deck-wide knob; an explicit `duration` is not scaled by it, as an effect's own times are not.
  - The whip's blur is an SVG Gaussian blur along the flight's direction on the world, written from the tween's progress like `follow`, so seek equals play; CSS `blur()` has no direction. It pans straight, without the zoom-out mid-point of a far flight: the zoom-out is what makes a flight slow to read.
- **Layout tokens are three, and the effects scale their other sizes from them.**
  - `--k-radius` is 12 px (the card radius), `--k-stroke` 4 px (a connector) and `--k-gap` 8 px (pyramid layers); a 16 px corner is `calc(var(--k-radius) * 16 / 12)`, so every default looks as before and a theme changes one number, not a dozen. More tokens would be one per literal.
  - Chart marks, map lines, icons, figures, halos, the CRT bezel and the SVG attributes of `fishbone` and `mindmap` keep their literals; `tests/lint/design.test.ts` lists each with its reason. A presentation attribute cannot take `var()`.
- **A section's tokens are inline custom properties on its scenes, with a pinned `--k-bg` layer for the stage; the JS-side readers follow a scoped element.**
  - Inline on the scene's box and SVG group, not a stylesheet rule, so no selector or load order can lose; `color` and `font-family` are set again there because they inherit as computed values from the stage. The stage's own `--k-bg` stays the deck's: the section's colour is a pinned layer in the canvas, which the existing background cross-fade, the transitions and the overview already carry, so a flight between an inverted and a normal section never shows the wrong colour. A section with a `background` picture keeps the picture and gets no colour layer.
  - `typeSize`, `gapPx` and `strokePx` read tokens in JS, so they resolve on the scene being built or stepped (`withTokenRoot`), else on `:root`. Contrast is measured only on the pairs that touch an overridden colour, since the rest is the deck theme's, already measured.
- **The colour-blind check is worst-case CIE76 ΔE under Machado 2009 matrices, with a floor of 10.**
  - Each pair of series colours is measured as seen with normal sight, protanopia, deuteranopia and tritanopia (Machado 2009, full severity, on linear sRGB), and the smallest ΔE counts. CIE76 is the plainest Lab distance and needs no table; the floor only has to separate "apart" from "confusable", not rank colours. Series 1 to 4 are checked against each other, 5 and 6 against their neighbours, as `themes.md` says.
  - The floor is 10, just under `bold`, the closest built-in at 11.5; the others measure 14.6 to 27.8. A higher floor would fail a shipped theme, a lower one would admit pairs that merge for deuteranopes. `tests/unit/brand-theme.test.ts` applies it to every built-in and every generated theme.
- **A generated theme sets the `--k-code-*` colours too, each nudged to 4.5:1 on the derived panel.**
  - The brief lists the other colour tokens, but a light theme that inherits calm's pale code colours has unreadable code on its light panel, and a dark one with a hue-tinted panel can fall under 4.5:1 too. Starting from daylight's (light) and calm's (dark) colours and nudging each in lightness keeps the hue.
- **Named layouts: `big-number` footnotes add up, and its number size is an estimate.**
  - The default renderer's plain text steps replace each other, but a number that vanished when its footnote came would defeat the layout, so `big-number` stacks its steps like `stack: true`. `thirds` and `full-bleed` keep the media-scene behaviour (text stays).
  - The number is measured in the DOM during the build (set at 100 px, measured with `measure`, scaled to the width inside the side padding, capped at 0.6 of the frame height with a line height of 0.8, which suits digits). Without layout (no size) it stays at 100 px. The first word is the number, so a unit is written without a space (`42%`, not `42 %`).
  - `full-bleed` puts a bottom `--k-scrim` of 0.7 under the caption (the background feature's mechanism, full over the bottom 45%). The image is built before the text in the DOM so the caption paints over it.
- **`bigType` clips media with an SVG clip path, and sizes the text from one DOM measurement.**
  - `background-clip: text` clips an image but not a video, so the box carries `clip-path: url(#id)` onto an SVG `<text>` and an `<img>` or `<video>` fills it: one path for both, seekable (only the box's fade is on the timeline). The ink box (`actualBoundingBox*`) is measured on a canvas at 100 px in the heading font and scaled to the rect, then centred by that box; the text is SVG in both cases (fill, or clip), so what is measured is what is drawn. An HTML span's advance width left a visible margin (side bearings, and an SVG text drawn slightly differently).
  - The default rect repeats the self-test's default safe area, since `ctx` carries no deck `safe-area`; a deck with another `safe-area` passes `rect`.
  - Follow-up (2026-10-31): `ctx.safe` now carries the deck's safe area, one default in `src/theme.ts` shared with the self-test; `bigType` and the titling effects default to it, so a deck passes `rect` only to leave the safe area.
- **Sources are collected in `ctx.deck.sources` as charts and stats build; `endRoll` fills its rows in its step.**
  - One array per `build` call, shared by every scene's `ctx.deck`, filled by `chart` (the CSV's `# source:` or the JSON's `source`) and the stats' `source` option as each builds, in deck order and deduplicated by exact text. "Origin not stated" is a placeholder, not a source, so it is never added. A scene built after the roll is not yet in the list at build time, so the roll's container is built in `build` (the timeline rule) and its text rows are added when `show(tl)` is called in pass 2, after every scene has built; no tween exists before then that depends on them.
  - The roll's scroll length is measured once in that step (`offsetHeight`) and fixed into a `fromTo` tween, so seek equals play. Speed is 90 px a second, capped at 40 s.

- **Rehearsal times live in `localStorage`, not in the deck.**
  - Why: they are one presenter's runs on one machine; a file in the deck would show up in diffs and be shared. Key: the channel name (path and title) plus `:rehearsal`. A new run replaces the last; the plan is the `outline` estimate (`src/plan.ts`), so the two never disagree.
  - A scene over its estimate is `--k-warn`; over by half again (1.5x) is `--k-bad`. The estimate is a flat pace (130 words a minute, 15 s a step), so a small overrun is noise and a large one is a real slow spot; 1.5x is a judgement, not a measured value. It is not configurable: one more knob for a hint on a side panel.

- **`klappe video` seeks GSAP's root timeline per frame and holds wall-clock loops still.**
  - Each frame sets the paused root timeline's time, so the stepper plays a step exactly as live (transition, flight, delays) and every frame is still a seek: the file is the same each run, however slow the machine. Seeking the canvas timeline alone would miss the transitions, which are standalone timelines on the root; all of them are, so none is cut. Playwright's fake clock was the other way: it moves GSAP only at its 16 ms frame ticks, so a frame is not its exact time.
  - Wall-clock loops (backgrounds, `mesh3d`, CSS and Web Animations, videos) hold their start, as with reduced motion; the ticker's clock is frozen by `lagSmoothing` and ticked by hand, so `mesh3d` still draws. A clock of their own driven by the frame was out of scope for v1 (ruling, 2026-10-31): every loop would need to take its time from outside.
  - Encoding uses the system `ffmpeg` from `PATH`, JPEG frames on stdin; no npm dependency (ruling). `window.klappe.gsap` exposes the page's GSAP, since `bin/` cannot import the deck's bundle.

- **A deck-kind review needs a `RUBRIC deck_arc` line.**
  - Why: every other rubric judges a scene or a file, so a deck with sound scenes and no through-line passed review. `.rubrics/deck_arc.md` reads the deck as the room hears it (`outline --story`); making the line mandatory means the arc is judged, not skipped.
  - The escape is the `unassessable` level (Minor): a deck with one scene, or with fewer than half its scenes carrying a story point (a catalog, a deck not yet given story points), is not marked `flat`. A diff that touches a few scenes is judged only on whether they fit the arc the rest already has.

## 2026-10-31 (backlog batch 5)

- **The e2e server has its own dependency cache, one per cwd.**
  - Why: Vitest sets `NODE_ENV=test`, which Vite folds into the optimizer's config hash. A dev or `klappe test` server on the shared `node_modules/.vite` (development) and the e2e ones (test) re-optimized after each other, and `klappe test` in a temp cwd (the CLI tests) rewrote the e2e cache with its own aliases. A re-optimize mid-run is what answers 504 Outdated Optimize Dep.
  - `tests/e2e/setup.ts` uses `node_modules/.vite-e2e-<hash of cwd>` (a throwaway dir under the system temp for a temp cwd) and waits for the optimizer's scan before it returns. Any other e2e test that starts its own Vite server gives it a `cacheDir` too.

- **A deck component draws the whole scene, and its steps are counted from `scene.md` as a code fence's.**
  - Why the whole scene: the shapes a deck repeats (the demo's `speakerProfile`) are scene factories that read the title and every step from `ctx.doc`; a component in the default renderer's right-hand slot could not hold them, and one that drew next to klappe's title and text would double them. So a component is a `scene.ts` `build` called from a fence.
  - Why the code-fence count: `outline` parses `scene.md` in Node and loads no deck `.ts`, so it cannot ask the builder how many steps it has. The parser does not know which names are components and counts their fence as any non-built-in fence, so `outline`, `klappe test` and the browser agree. The builder returns step functions for those steps; a mismatch is a deck problem, as for a `scene.ts`.
  - A name klappe's own fences use (`console`, `chat`, a Shiki language) is a deck problem and the built-in wins, so a deck cannot quietly change what a code block does.

## 2026-10-31

- **Own transitions: reduced motion maps a function to fade without calling it; a bad function falls back to fade with a problem.**
  - Why: klappe cannot know how intense a deck's own motion is, so reduced motion treats it like the intense built-ins. A function without `reveal` (or that throws) must not fail the deck mid-talk: the move still lands with a fade, and the problem names the section.
