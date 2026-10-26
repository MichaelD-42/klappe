# Backlog

Open work only, ranked within each section; CHANGELOG.md lists what is done and git history has the old lists. A defect is fixed test-first: if its test already passes, the entry was stale and is dropped.

## Effects


## Tooling

- `klappe test` writes `data/TODO.md` and `media/TODO.md`, which the `@deck/**/*.md` glob in `src/deck/load.ts` takes in, so a `klappe test` run reloads an open deck. Leave them out of the glob, as `review.md` is.
