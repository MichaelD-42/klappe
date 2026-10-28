# Evals

Evals check how well Claude works with klappe. Each case plants a change in a fresh copy of the repo, runs Claude there and grades what it did.

There are two suites:

- `reviewers`: a reviewer agent reads a planted change. The grade checks its `VERDICT` line and, if the case asks, its `RUBRIC` levels. The summary gives the recall (expected FAIL cases that the reviewer failed) and the false-block rate (expected PASS cases that it failed).
- `skill`: Claude builds a task with the `klappe` skill. The grade checks the files the run wrote.

## Run

Each run costs real money. It uses your own Claude login.

```
npm run eval:reviewers
npm run eval:skill -- --case typed --runs 3
```

- `--case <name>`: run one case, the name of its folder.
- `--runs <n>`: run each case n times. Default 1.

Claude runs as `claude` on your PATH. Set `KLAPPE_CLAUDE` to use another command. A `.mjs` or `.js` file there runs with node, so a test can stub Claude.

Each run uses a new git worktree of `HEAD` in the temp folder. The runner removes it after the run. Commit your work first: the copy does not see changes you have not committed.

## Results

The runner prints one line per run, then per case pass@1 (the share of runs that passed) and pass^k (1 if all k runs passed). Then it prints the recall and false-block rate (reviewers only), `errors` and the cost.

`errors` counts runs that could not be graded: Claude failed, printed no JSON, or the reviewer gave no verdict. These runs fail, but they do not count in the recall or the false-block rate.

The full results go to `evals/results/<time>.json`. Git ignores that folder.

Exit codes:

- `0`: every run of every case passed.
- `1`: at least one run failed or had an error.
- `2`: wrong arguments, or no case found.

## Add a case

Make a folder `evals/<suite>/<name>/` with a `case.json`.

A reviewer case has these fields:

- `agent`: the reviewer agent, for example `klappe-review-tech`.
- `brief`: the task the reviewer checks against, with its acceptance criteria.
- `expect.verdict`: `PASS` or `FAIL`.
- `expect.rubric`: optional. Maps a rubric dimension to the level the report must give, for example `{ "scene_purpose": "clear" }`.

A skill case has these fields:

- `prompt`: the task Claude builds.
- `agent`: optional. The agent to run as.
- `expect.match`: maps a glob to a regex. At least one file under each glob must match its regex.
- `expect.absent`: optional. Maps a glob to a regex. No file the run changed under the glob may match.

Put the planted change in `overlay/`, with the same paths as in the repo. The runner copies it over the copy and commits it. A reviewer sees that commit as the change to review. Keep overlays small: the reviewer prompt holds the whole diff.

The repo is public. Cases must not hold confidential deck content. Use the demo deck or made-up content.
