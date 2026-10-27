# Git history: `gitGraph`

A git history built one change per step: commits as dots on one lane per branch, lines to their parents, the branch names at the left. Each step plays the next op (a commit, a new branch, a merge, a rebase, a tag or a cherry-pick), and what it made is ringed in `--k-accent` until the next one. For developer trainings.

Catalog: section `304-git` (`#/git/rebase/6` is the rebase, `#/git/rebase/7` the merge; `#/git/backport/2` a tag, `#/git/backport/7` a cherry-pick).

## `gitGraph`

Only in `scene.ts`. From `decks/demo/sections/304-git/10-rebase/scene.ts`:

```ts
import { gitGraph, type GitGraphHandle } from "klappe/fx";

build: (ctx) => ({
  g: gitGraph(ctx, {
    x: 160, y: 220, w: 1600, h: 520,
    ops: [
      { commit: "main", label: "init" },
      { branch: "feature", from: "main" },
      { commit: "feature", label: "form" },
      { commit: "main", label: "hotfix" },
      { rebase: "feature", onto: "main" },
      { merge: "feature", into: "main" },
    ],
  }),
}),
steps: [(tl, r: { g: GitGraphHandle }) => r.g.next(tl), /* one per op */],
```

### Options

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `ops` | `GitOp[]` | required | the history, in order; one `next` plays one op |
| `x`, `y`, `w`, `h` | numbers | required | the area, scene-local. The branch names take its left 220 px; the rest is one column per commit (up to 200 px) and one lane per branch (up to 180 px) |

`GitOp` is one of:

| Op | Does |
| --- | --- |
| `{ commit: "main", label: "init" }` | a commit on the branch's tip. The first commit makes the first branch; every other branch needs a `branch` op |
| `{ branch: "feature", from: "main" }` | a new lane starting at `from`'s tip; its name shows and that commit is ringed |
| `{ merge: "feature", into: "main", label? }` | a merge commit on `into` with both tips as parents (label `merge feature` by default). Always a merge commit, never a fast-forward |
| `{ rebase: "feature", onto: "main" }` | the branch's own commits (since it started, its last rebase or its last merge) fade out, and their copies, labelled with a prime (`form′`), fly to the branch's lane after `onto`'s tip |
| `{ tag: "v1.0", on: "main" }` | a tag on the branch's tip: a pill in `--k-surface` over the commit, which is ringed. It takes no column. A later rebase leaves the tag on the old commit, as git does |
| `{ cherryPick: "hotfix", onto: "main" }` | a copy of the latest commit labelled `hotfix` (`hotfix′`) flies from it to `onto`'s lane after its tip; the original stays |

Dots are 36 px in the lane's `--k-series-1` to `--k-series-6` colour; lines are 5 px in the child's lane colour, a merge's line from the merged branch in that branch's. Labels are 20 px `--k-fg` under the dots, on a `--k-bg` patch that lines pass behind.

### Step adders

Both are step adders themselves: `r.g.next(tl)`.

| Handle | Step |
| --- | --- |
| `next` | the next op: the lines into its commits draw on and the dots arrive; a new branch's name fades in; a rebase as above. The previous op's ring fades |
| `show` | every op not played yet, one after the other, in one step |

### Limits

- The layout is fixed in `build`: more commits than columns of 110 px fit in `w` shows `gitGraph: <n> commits do not fit in <w>px`; more lanes than 110 px each in `h` shows `gitGraph: <n> branches do not fit in <h>px`; more than six branches shows `gitGraph: <n> branches; at most 6`. A rebase's and a cherry-pick's copies are commits too.
- A label wider than its column shows `gitGraph: label "<label>" too long` (checked when the first step is added) and is cut with an ellipsis.
- An unknown branch shows `gitGraph: no branch "<name>"`, a repeat `gitGraph: branch "<name>" already exists`, a branch from a branch with no commit `gitGraph: "<name>" has no commit to branch from`. A rebase with nothing to replay (the branch was just merged or rebased) shows `gitGraph: rebase of "<a>" onto "<b>" has nothing to replay`; one that would replay a merge commit draws it as a plain commit and says so. A tag on a branch with no commit shows `gitGraph: "<name>" has no commit to tag`; a cherry-pick of a label no commit has, `gitGraph: no commit "<label>" to cherry-pick`. Two tags on one commit sit on top of each other. `next` after the last op shows `gitGraph: next() after the last op`.
- No tags, `HEAD`, cherry-pick or squash.

## `gitLayout`

`gitLayout(ops, { x, y, w, h })` gives `{ commits, lanes, tags, lit, colW, problems }`: each commit is `{ id, label, lane, parents, op, gone?, copyOf?, x, y }` (ids `c0`, `c1`, … in the order they are made; `op` is the op that makes it, `gone` the rebase that retires it, `copyOf` the commit a rebase or cherry-pick copied), each lane `{ name, op, y }`, each tag `{ name, commit, op }`, and `lit[k]` the commit ids op `k` rings. It is what `gitGraph` draws; tests use it.
