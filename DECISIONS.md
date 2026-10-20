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
- **Open TODO (see also the skill decision below):** add `klappe:sync` to the deck template docs when the template exists (M4).

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
