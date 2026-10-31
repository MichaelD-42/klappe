# Backlog batch of 5

Five entries of `docs/backlog.md`, built one per task on branch `feat/backlog-next10`, on top of the previous batch. Chosen because they change the deck format or the `scene.ts` API (which 1.0.0 freezes), plus the e2e flake every batch pays for. No separate spec: the backlog entry text quoted in each task, the repo's `CLAUDE.md` rules and `DECISIONS.md` are the authority.

## Global Constraints

- Test first: a failing test for each criterion, then the code. Unit tests in `tests/unit/`, browser behaviour in `tests/e2e/`, a small option on an existing effect in `src/deck/fixtures/fx-options.ts` and `tests/e2e/fx-options.e2e.test.ts`.
- Seek must equal play. Anything on a timeline is a pure function of the step; anything on the wall clock sits under `data-k-ignore`, holds still with reduced motion and in the self-test. `?selftest=walk` must stay green.
- Effects take colours only from `--k-*` tokens. A new token gets a line in `docs/reference/themes.md` and a default in `src/themes/calm.css`.
- A new `klappe/fx` export needs a heading in `docs/reference/`, a call in the demo catalog (a section from `100-catalog` on), and a row in the skill's "Choose the element by intent" table (`.claude/skills/klappe/SKILL.md`), or the lints fail. Scene ids are unique across the whole demo deck: grep before naming one.
- Every user-visible change gets a line in `CHANGELOG.md` under the open version at the top. A choice someone will later question gets a `DECISIONS.md` entry. When a task is done, delete its entry from `docs/backlog.md`.
- No new npm dependency. Visible changes: `npm run shot -- <section>/<scene>` and read the PNGs. e2e tests assert properties, never where text wraps; a wide-font test uses a font klappe bundles (Space Grotesk Variable), never a system font.
- Design rules: no cream or off-white backgrounds, no italic accent words in headlines, no numbered "01/02/03" labels, no monospace labels, no pill-shaped buttons.
- Match the surrounding code's style and comment density. Minimum code that meets the criteria.
- Run `npx tsc --noEmit`, `npx vitest run --project unit` and the e2e files you touched before committing.

## Task 1: e2e startup and Vite's dependency optimizer

Backlog: "e2e startup races Vite's dependency re-optimizer ("Re-optimizing dependencies because vite config has changed" on every run; one full run failed 31 tests with 504 Outdated Optimize Dep). Warm or pin `optimizeDeps` in `tests/e2e/setup.ts`."

Criteria:
- Find why Vite thinks the config changed on every run (likely: `tests/e2e/setup.ts` sets `KLAPPE_REVIEW_FILE`/`KLAPPE_TEXT_DIR` to fresh `mkdtemp` paths that `vite.config.ts` folds into the config, so its hash differs each run; confirm or refute). Fix the cause so a second consecutive run does not re-optimize, without changing what the dev server serves to authors.
- Independently, make the e2e server ready before any test loads a page: the optimizer has finished (all deps the deck and fixtures import are pre-bundled) when `setup` returns, so no test can hit `504 Outdated Optimize Dep`. Prefer pinning `optimizeDeps.include` / `entries` for the dynamic imports (shiki, katex, the fx chunks) or awaiting the optimizer, whichever Vite supports cleanly.
- Evidence in the report: two consecutive full `npm test` runs, the second without "Re-optimizing dependencies", both green. No test file changes beyond setup unless required.
- CHANGELOG only if user-visible (likely not; a DECISIONS line if the fix pins a dependency list someone must maintain).

## Task 2: Safe area on ctx

Backlog: "Safe area on ctx: effects read the deck's `safe-area` (today `bigType`, titling and the self-test each hard-code 64 and 48); one shared helper."

Criteria:
- The deck's resolved safe area (from `deck.md` `safe-area`, default `[48, 64]`) is available to effects through `ctx` as a rect in scene px (e.g. `ctx.safe: Rect`, inside `ctx.rect`), documented in `docs/reference/deck-format.md` next to `ctx.rect`. One source for the default: the self-test's `SAFE_AREA` and the effects read the same constant.
- `bigType`, `lowerThird` and `endRoll` default to it instead of their hard-coded 64/48; the `klappe theme --logo` overlay template positions from it if the overlay ctx has it (else from `ctx.rect` as now).
- e2e: a fixture deck with `safe-area: [100, 200]` puts a default `bigType` and `lowerThird` inside that inset; the default deck behaves as before.
- Docs updated where they mention the hard-coded default (bigType, titling, DECISIONS entries that recorded the shortcut get a follow-up line).

## Task 3: Own transitions

Backlog: "Own transitions: `section.ts` `transition` takes a function as a background's `animate` does, with the same `reveal` label contract, so a deck has its own transition without forking klappe. Today `TransitionKind` is a closed union of twelve."

Criteria:
- `section.ts` `transition` accepts, besides the twelve names, a function with the signature the built-in transitions in `src/fx/transitions.ts` have (old canvas element, new canvas element, options) returning a GSAP timeline that contains a `reveal` label (where the first step of the new canvas starts). `transitionOptions` is passed through. Export the type from `klappe/types`.
- A function without a `reveal` label is a deck problem naming the section, and the deck falls back to `fade`. A back move, jump and `?instant=1` still cut, as for built-ins. Reduced motion handles it the way it handles built-ins.
- Works with `klappe video` (it seeks the root timeline) and the walk.
- e2e on a fixture: a custom transition plays (its tweens run, the first step starts at `reveal`), a missing `reveal` reports the problem. A demo catalog scene in the transitions sections with a small own transition (e.g. a wipe in the accent colour, tokens only). Docs under `section.ts` in `deck-format.md` with a short example; the skill mentions it where transitions are chosen.

## Task 4: Deck components in Markdown

Backlog: "Deck components in Markdown: a deck registers a fence or trigger for its own helpers (the demo's `speakerProfile`, `planChip`), so `scene.md` can use them without `scene.ts`."

Criteria:
- A deck can register its own Markdown fences in one place at the deck root (follow the `overlay.ts` precedent: an optional root module, e.g. `components.ts`, default export mapping a fence name to a builder `(ctx, body, info) => step functions or handle`). Read how built-in fences become parts today (`src/render/parts.ts`, `fenceProblem`, `docs/reference/markdown.md`) and plug into that path rather than adding a second one.
- A ```` ```<name> ```` fence in `scene.md` with a registered name renders the deck's component; its steps line up with `scene.md` steps the same way built-in fence parts do. An unregistered name stays the existing problem. A name that collides with a built-in fence is a deck problem, and the built-in wins.
- The demo registers `speakerProfile` and `planChip` (decks/demo/shared/) and one catalog scene uses each from `scene.md` alone, with no `scene.ts`. The scan plugin still finds the effects these components import.
- e2e on a fixture; docs in `docs/reference/markdown.md` and `deck-format.md` (folders list); the skill says to prefer a registered component over a `scene.ts` for repeated deck patterns. Note in the report whether "Icons in Markdown" (a later backlog entry) could be built as such a component.

## Task 5: Deck cuts

Backlog: "Deck cuts: one deck in several lengths (a 20- and a 45-minute cut that leave sections out) and a backup appendix outside the main flow, one jump away for Q&A. Today a re-cut means a copied deck."

Criteria:
- `deck.md` takes `cuts: { <name>: [<section id>, …] }`: a cut keeps only the listed sections, in deck order. `?cut=<name>` in the URL plays that cut; an unknown cut or section id is a deck problem. With no `?cut`, the full deck plays as today.
- A section can be an appendix (`appendix: true` in its `section.md` frontmatter): it is outside the main flow (next/previous never enter it, the step counter and progress ignore it), reachable by deep link, the overview and the selector, and one key jumps to the first appendix section and back to where the talk was. Pick a free key (check `src/input.ts` and the speaker view keys).
- The tools follow the cut: `klappe outline --cut <name>` (estimate per cut against `duration`), `klappe pdf --cut <name>`, `klappe video --cut <name>`, `klappe test --cut <name>` walks that cut. Appendix sections print last in `outline` and `pdf`, marked as appendix.
- e2e: a fixture with three sections, a cut of two and one appendix: next never enters the appendix, the key jumps there and back, `?cut=` skips the left-out section, a deep link into a left-out section in a cut is handled (pick: report it and go to the cut's first step), the walk is green per cut. Unit tests for the parsing and the cut step list.
- Docs in `deck-format.md` (deck.md keys, section.md, Keys, URL flags) and the CLI help; DECISIONS for the key and the deep-link rule; the demo gets one cut and one appendix section so the catalog shows it.
