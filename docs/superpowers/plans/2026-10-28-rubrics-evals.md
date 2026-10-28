# Plan: rubrics and evals in the build loop

Spec: `docs/contrib/2026-10-28-rubrics-evals.md`. Rubrics: `.rubrics/*.md` (committed, version 1).

Scope: the deterministic checks klappe can own, the verdict gate, the reviewer suite and the skill suite.
Not in scope: the outcome suite and deck-specific cases (they hold a real deck's content; this repo is public, so they go in the deck repo); contrast on the real backdrop (needs a design spike); timer lint (deck repo).

The rubric frontmatter is flat, so `src/parse/frontmatter.ts` reads it: `levels: [..]`, and one `rule-<level>: [<severity>, <disposition>]` per level. Severity is `none`, `Minor`, `Important` or `Critical`. Disposition is `pass`, `builder` (back to the builder), `planner` (back to planning) or `owner` (the deck owner decides).

## T1 — verdict gate, `bin/verdict.mjs`

Files: `bin/verdict.mjs`, `tests/unit/verdict.test.ts`.

Usage: `node bin/verdict.mjs --kind <framework|deck> [--task <id>] [--log <file>] <report>...` (in a deck repo `node klappe/bin/verdict.mjs`). A report is one reviewer's output saved to a file.

- AK-1: It reads the rubrics from `.rubrics/` next to `bin/` (resolve from `import.meta.url`), with `parseFrontmatter` from `src/parse/frontmatter.ts` loaded through vite `runnerImport`, as `bin/outline.mjs` does.
- AK-2: Format check. The first line must be `VERDICT: PASS` or `VERDICT: FAIL`. A finding line (`<loc> — <severity> — ...`) must use Critical, Important or Minor. A `RUBRIC <dimension>: <level> — <evidence>` line must name a known dimension and one of its levels. Every dimension whose `applies_to` holds the kind must have at least one RUBRIC line across the reports. Each violation prints `format: <report>: <problem>`; then exit 2.
- AK-3: Rule. Each RUBRIC line maps through its dimension's `rule-<level>` to a severity and a disposition. A Critical or Important finding counts as disposition `builder`. The decision is the worst disposition, in the order planner, builder, owner, pass. Print `DECISION: <planner|builder|owner|merge>`, then one line per reason. Exit 0 for merge, 1 otherwise.
- AK-4: Log. With `--log`, append one JSON line per RUBRIC line: `{ date, task, kind, dimension, version, level, ref, severity, disposition }`. `ref` is the scene id from a scene_purpose line, else null. Without `--log`, write nothing.
- AK-5: Export the parser and the rule as functions, so T3 can grade with them. The unit test covers each AK with small inline reports and the real `.rubrics/`.

## T2 — strict walk and the word limit

Files: `bin/klappe.mjs`, `bin/outline.mjs` (only to export what you need), `tests/e2e/walk.e2e.test.ts`, a new unit test under `tests/unit/`, `docs/reference/deck-format.md`.

- AK-1: `klappe test --strict` turns walk warnings into failures; without it nothing changes. Pass it the way `--only` and `--bail` pass (an env var read by the walk test).
- AK-2: `max-words: <n>` in `deck.md`. `klappe test` fails when a step's on-screen text (the list item, not its notes) has more than n words, and names each step as `#/<section>/<scene>/<step>: <count> words > <n>`. Count with the outline's step text. No key, no check.
- AK-3: The docs: both in `deck-format.md` (the `max-words` key next to `safe-area`, and `--strict` under Look checks).
- AK-4: In the hand-back, report how many walk warnings the demo has today, so we know whether `--strict` can be on by default.

## T3 — eval runner, `bin/eval.mjs`, after T1

Files: `bin/eval.mjs`, `evals/**`, `tests/unit/eval.test.ts`, `package.json` (scripts only), `.gitignore`.

- AK-1: `npm run eval:reviewers` and `npm run eval:skill` run `node bin/eval.mjs <suite> [--case <name>] [--runs <n>]`. `npm test` never runs them; check that the vitest config does not pick up `evals/`.
- AK-2: Per case and run: make a fresh copy of HEAD with `git worktree add --detach` in the OS temp dir, link `node_modules` (a junction on Windows), copy the case's `overlay/` over it and commit that as one commit, run Claude, grade, then remove the worktree, also on failure.
- AK-3: Claude runs as `<bin> -p [--agent <agent>] --output-format json --max-turns <n> --allowedTools <list> <prompt>` in the copy. `<bin>` is `KLAPPE_CLAUDE` or `claude`. Read the text from `result` and the cost from `total_cost_usd`.
- AK-4: Case file `evals/<suite>/<case>/case.json`. Reviewers: `{ agent, kind, brief, expect: { verdict, rubric?: { <dimension>: <level> } } }`; the prompt is the brief plus `git diff HEAD~1` of the copy. Skill: `{ prompt, expect: { match: { <path>: <regex> }, absent?: { <glob>: <regex> } } }`; grade the copy's files after the run.
- AK-5: Reviewer grading uses T1's parser: the verdict must match, and each expected dimension's level must match. The summary prints recall (expected FAIL cases that failed), false-block rate (expected PASS cases that failed), pass@1 and pass^k per case, and the total cost. It writes the full result to `evals/results/<timestamp>.json` (gitignored).
- AK-6: Cases, each a defect planted in the demo deck, or a clean demo scene:
  - Reviewers, must fail: a scene with no point (content, `scene_purpose: unclear`); a change that misses a criterion in its brief (content, `intent_fidelity: partial`); a step that creates DOM or uses `from` (tech); a last step where text covers text (look).
  - Reviewers, must pass: a clean change with a brief it meets (content), and the same for tech.
  - Skill: one brief per intent, with a regex for the element — replay a conversation (`chat`), a command and its output (a `console` fence), a hard question for the room (`### ...?`), a loop of phases (`cycle`), typed text in the deck font (`typed`, and no new file in `shared/`).
- AK-7: `tests/unit/eval.test.ts` runs one case of each suite against a stub `KLAPPE_CLAUDE` script and checks the grading and the summary. No real Claude call in tests.

## Inline (orchestrator), after T1

- The reviewer prompts. Look: drop the design-rule items `tests/lint/design.test.ts` covers; keep "theme tokens, not ad-hoc colours", because the lint checks colour literals only in `src/fx/`. Content: read the rubrics whose `applies_to` holds the task kind, and print one RUBRIC line per dimension after `VERDICT:`. All: the criteria in the brief are input; judge from the brief and the diff, not the builder's report.
- `klappe-builder.md` step 1: read the acceptance criteria. `building-a-deck.md` steps 5–7: the brief carries criteria (the owner's review entries for a scene), builders run `--only <section> --strict`, and the orchestrator runs the verdict gate after the reviews.
- `SKILL.md`: one line under "Check your work" that points to the gate.
- `CHANGELOG.md`.
