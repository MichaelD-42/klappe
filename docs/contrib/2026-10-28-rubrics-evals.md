# Rubrics and evals in the build loop

Status: built on `feat/rubrics-evals`. The plan with acceptance criteria is `docs/superpowers/plans/2026-10-28-rubrics-evals.md`.

## Why

klappe is built in a loop: an orchestrator, one builder per task, then three reviewers (tech, look, content). A recent deck build showed two gaps.

- **The reviewers judged by feel.** Each picked Critical, Important or Minor freely. The same problem was Important one day and Minor the next, and a few reports used other severity words.
- **The reviewers checked a scene against its storyboard, not whether it makes a point for the room.** Content reviews passed scenes that the deck owner then cut as "adds nothing" or "I do not understand what this is about". Most fix rounds came from the builder misreading what the owner asked for.

A third gap: when we change the skill or a reviewer prompt, nothing tells us whether the loop got better or worse. A change to the harness is a change to the product.

## What we built

**Step 1: code first.** If a failure is visible at once and code can find it, it is a check, not a judgment.
- The look reviewer no longer repeats the design rules that `tests/lint/design.test.ts` checks. It keeps "theme tokens, not ad-hoc colours", because the lint checks colour literals only in `src/fx/`.
- `klappe test --strict` fails on a look warning (safe area, clipped text). It is opt-in: the demo has 12 clipped-text warnings today.
- `max-words: <n>` in deck.md fails a step with too many words on screen.

**Step 2: rubrics for what needs judgment.** One file per dimension in `.rubrics/`. Each has YAML frontmatter that code reads (levels, and one `rule-<level>: [severity, disposition]` per level), and anchors in prose that the reviewer reads. We start with two:
- `intent_fidelity` (framework and deck): does the diff meet the brief's acceptance criteria, and nothing else?
- `scene_purpose` (deck): can someone in the room say what the scene is for?

A dimension is only written for an error that repeats and that no check can catch. The rubric does not know the task: the acceptance criteria come in with the brief. For a deck fix round they are the owner's review entries for the scene. A rubric change is its own commit, never in the change it judges.

**The gate.** `bin/verdict.mjs` reads the saved reviews. It rejects the wrong format, including a verdict that disagrees with its own findings. Then it applies each rubric's rule and prints a decision: `merge`, `builder`, `planner` or `owner`. With `--log` it appends one JSON line per rubric verdict. After about 30 tasks, read the log. A dimension that always gives the same level judges nothing, so drop it. A finding that keeps coming back wants a check in `klappe test`.

**Step 3: evals.** `bin/eval.mjs` runs a case in a throwaway copy of the repo with `claude -p` and grades the result with code. See `evals/README.md`.
- **Reviewer suite**, defects planted in demo scenes plus clean changes. It measures each reviewer's recall and false-block rate. A reviewer that misses defects lets them through; one that blocks clean work costs the loop its autonomy.
- **Skill suite**, a short brief in and a scene out, with the expected element checked by regex. It measures whether the skill steers the agent to the right element.

Run the matching suite when the thing it measures changes:

| Change | Run |
|---|---|
| `SKILL.md` or `docs/reference` | the skill suite |
| A reviewer prompt | that reviewer's cases |
| New model | both suites |
| Weekly | a small fixed set, for model drift |

## Not here

- **An outcome suite.** It would replay real tasks that took several fix rounds. It needs a real deck's history, so it belongs in that deck's repo, not in this public one.
- **A contrast check on the real backdrop** (a picture or a gradient). It needs a design spike.
- **Loop intelligence**, reading the sessions for patterns. It stays a manual read at each deck milestone, fed by the verdict log.
