# Backlog after M1

Deferred findings from the M0+M1 reviews, triaged by the final review (2026-10-16). Pick up when planning M2/M3.

## Parked

- Deck problems never fail `klappe build` (only overlay + failing selftest). Fix in M3 with the single-file build.

## Raw deferred items (per task)

- Task 1: minor (deferred): package.json npm-init leftovers (main, license ISC); no "bin" field — CLI invoked by path
- Task 1: minor (deferred): vitest include lacks tests/e2e — Task 2 must fix
- Task 1: minor (deferred): --deck --foo parsed as id; main.ts prints '---' (replaced in T10)
- Task 2: minor (deferred): page.goto default 30s timeout < 90s selftest wait; empty selftest script → bare SyntaxError
- Task 3: minor (deferred): agents claim npm scripts work in deck repos — Task 4 init must create root dev/build/test scripts (carried)
- Task 3: minor (deferred): sync merges dirs, never prunes stale files inside skills/klappe/
- Task 4: minor (deferred): cwd===klappeDir guard is plain string compare (Windows case); deck.e2e fails on any console.error (favicon risk); init silently drops devDependencies.klappe
- Task 5: minor (deferred): frontmatter inline lists split on commas inside quotes; mixed [a,[b]] list flattened
- Task 6: minor (deferred): toDeckRelative cuts at leftmost 'sections/' (ancestor dir named sections breaks it); multiple blockquotes on one step overwrite (scene) vs first-wins (section); blockquote between ### Q? and answer drops the answer silently; nested quote inside list item joins into step text; multi-paragraph notes lose breaks
- Task 7-9: minor (deferred): mixed CRLF/LF line endings in repo (no .gitattributes); router single navigating flag vs overlapping popstates; rejected onNavigate → unhandled rejection; popstate stale hash not replaceState'd; dup id in shared group kept in ids
- Task 10: minor (deferred): problems overlay ad-hoc colors (#3a0d12,#ff6b6b) → tokens in M3; 1px subpixel edge at 1366; shout default assumes fade = enter+2; module step with negative offset reaches into previous step; reducedmotion=1 flag undocumented; title fade adds 0.6s after camera move; missing rect throws outside safe()
- Task 11: minor (deferred): legibility skips section-module text (data-section layers); camera scale from world only
- Task 12-14: minor (deferred, triage at final review): channel postMessage throws on origin "null" (file:// — matters for M3 single-file) inside step emit; stage moves under open overview/selector via speaker cmd/history/A — close panel in go/cmd; problems overlay click advances (add data-no-advance in ui/problems.ts); autoplay first hold counts from keypress mid-play; autoplay loop rejection unhandled; OverlayPanel/button live in selector.ts (→ ui/panel.ts); dup scene lookup in speaker view; channel keyed by deck title; overview clone dup ids; speaker css in styles.css outside T13 list
- Task 12-14: minor (deferred, look): speaker view — current step should be largest text, notes larger, type scales with viewport, add "N / M" progress, clamp next preview to 2 lines; overview — distinguish current marker from focus ring, gap between cells, caption backing; selector — current section indicator beyond focus ring
- Task 15: minor (deferred): clarification box ~20% from left not centred; pull-back still sparse thin band, labels near 14px bar; Example A Boot + Example C Coming together/Working on the topic deferred to M2 (state it in README); old-way step 1 reads as slide description (spec text, placeholder); deck-repo tsconfig needs "klappe/types": ["./klappe/src/types"] (Task 17 README + klappe init)
- Task 16: minor (deferred): ac failure path may exceed driver 90s timeout (CHECK_MS 15s ×9) and timed-out fn keeps running; lint misses named mono fonts (Consolas/Menlo/"… Mono"), font: italic shorthand/oblique, pill on non-btn class or var()/em radius, protocol-relative //cdn; real-input test getByRole 'Next' not exact
- Final: deferred triage recorded per reviewer table (M2: overview clone dup ids, shout answer drop problem, negative-offset rule in README, legibility for section text, toDeckRelative; M3: look polish, lint gaps, prod bundle gating of selftest/fixtures, index.html lang/title, types consolidation, panel.ts)

# After M2

Deferred findings from the M2 reviews (2026-10-19), copied from the M2 build ledger and grouped. Pick up when planning M3.

## Engine follow-ups

- Scenes should read parsed scene text (title, shout question and answer) and deck meta (intensity, lang) through `ctx`. Every demo section copied its text into `scene.ts`, so text can drift from `scene.md`.
- Engine API gaps:
  - The `worldMap` handle should expose site positions and arc paths. Decks use the internal `fitProjection` and `arcPath` today.
  - `figure` needs a stroke-width option.
  - `Ctx` should carry deck meta (intensity, lang). Effect UI words in `media.ts` are English until then.
  - `arc()` and `appear()` need an `at` position.
- `ctx.problem` has no play-time caller; load-time problems are surfaced (Task 0).
- Lucide bundle size: decide in M3 (IconNode input option).
- Perf (docs/perf-m2.md): with a GPU, the shatter fall lost 0.2 to 1.2 s of a 2.2 s step to long frames (worst frame 667 ms), and the swarm stream lost about 1 s to 3 to 5 long frames in some runs (worst 467 ms). The cause is not proven. Check it in the user's manual 60 fps run.
- Shatter step adders seek the canvas timeline at load (R12). An engine hook may replace that later.
- Reduced motion still plays the zoom dive, the CRT flash and the shatter. Consider a fade fallback.
- A deep link onto a video step shows the poster, paused. This is by design.
- The bundle holds all effects for every deck (Lucide, world-atlas, d3). Decide in M3.
- The self-test legibility check ignores SVG group scale. It undercounts text size, so it errs on the safe side.
- The `ac` self-test now has 12 checks of up to 8 s each. If most of them time out, the run takes up to 96 s, over the driver's 90 s wait.

## Effects

- Shatter (Task 1): black backdrop strip visible at top mid-fall; the box is measured at the crack but the copy is taken at the fall (adjacent steps).
- CRT (Task 2): bloom edges slightly olive-grey; amber READY cursor not captured in a shot (blink phase); long-text floor at about 14 px; no test for the bad count line problem.
- Art and icons (Task 3): the `javascript:` filter misses entity and tab tricks and leaves set/animate/use/image (author art, low risk: document it); icon draw start computation is fragile (`drawOn` could return the start); the 0.5 cutoff is undocumented; normalisation sets `fill: none` inside defs/clipPath/mask.
- Chart (Task 4): "Total" label is English; timeline columns are positional.
- Shout (Task 5): a DOM query on `[data-k-shout=answer]` instead of the WeakMap would remove module state; the `back.out` overshoot is not checked visually.
- Figure (Task 7): clearer arm swing (10 to 15 degrees), the seated figure needs a chair and arms, standing figures closer and the group larger at 1366; the pose mapping has no unit test.
- Swarm and motion (Task 8): dots cross the Inbox label mid-flight; the landed pile is a uniform grey; morph text has low contrast mid-frame; no test of morph play-time start values; the swarm canvas is not re-rasterised on a deeper zoom.
- Full-frame pictures: a flat scrim of 0.6 darkens the whole picture; a gradient scrim (dark only under the text) would keep more of it. `show()` finds its step's start through a `step` label that `appendStep` moves; pass the step start to step functions if more helpers need it. The TODO scan of `.ts` files is a regex: an `href` built at run time is not listed.
- Media (Task 9): a `youtu.be` link with an empty id gives `/embed/undefined`; `youtube-nocookie` and `music.youtube` are not matched; the `EMBED_OK` allowlist lacks a negative test. Task 0: the media HTML wrapper has no opaque backdrop (the SVG one has).

## Demo deck

- Opening (Task 11): the black hold is its own click (matches its spec bullet, kept); the power-on flash is a flat mint card; no cursor at power-on (spec bullet 1); the placeholder logo is not in a TODO.
- Value stream (Task 12): the overview band is still modest with a left-aligned caption; the carried stack overlaps the right hand; analysis step 1 frame is mostly empty; the clarification-2 label sits about 10 px from the bottom edge.
- Global team and meeting (Task 13): the shout "Decide." step dims differently from the question steps; coastlines cut site-name digits; arcs cross arriving figures in the zoomed host shot; meeting figures are dimmed by reaching into the figure DOM; map labels are turned off via empty text.
- Numbers (Task 14): chart notes repeat the bullets; video playback is unverified offline (user manual check).
