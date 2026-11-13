# Backlog

Open work only, ranked, most important first. CHANGELOG.md lists what is done and git history has the old lists. A defect is fixed test-first: if its test already passes, the entry was stale and is dropped. 1.0.0 shipped on 2026-11-08; these are for 1.x and must break no deck.

- **Clock and timer overlay.** A key fades a small live clock, or a countdown to the end of the talk from `deck.md` `duration`, over any scene on the audience screen, and fades it out again. Not the `timer` element (one scene, placed in `scene.ts`) nor the speaker view's clock (presenter only). It runs on the wall clock, so it is under `data-k-ignore` and absent from the walk, `pdf`, `shot` and `video`; colours from `--k-*` tokens. Open: clock, countdown or both, which key (`C` is free), and where it sits.
