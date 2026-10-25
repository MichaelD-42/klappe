## Rebase, then merge

> A history drawn one change per step: commits, a branch, a rebase and a merge.

- The first commit on main.
- A feature branch starts there.
- Work on the branch.
- Meanwhile, a hotfix lands on main.
- More work on the branch.
- Rebase: the branch's commits replay after the hotfix, as new commits.
  > The primes mark new commits: same change, new hash.
- Merge it back into main.
