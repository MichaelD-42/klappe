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
