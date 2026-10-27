## A backport

> Tags mark releases; a cherry-pick copies one commit (named by its label) onto another branch and keeps the original.

- The first commit on main.
- Tag it: v1.0 ships.
- A release branch from that tag.
- Main moves on with a feature.
- A hotfix on the release branch.
- Tag it: v1.0.1 ships.
- Cherry-pick the hotfix back onto main.
