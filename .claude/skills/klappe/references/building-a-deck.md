# Building a deck from a storyboard

Use this when one person or one agent team builds a whole deck, many scenes at once. Each step ends before the next one starts.

1. Write one storyboard block per scene before any code. Use these keys, in order: `id`, `story point` (the one thing the room takes away), `motion idea` (what the motion teaches, or why a still frame is better), `character` (if the deck has one), `fx` (klappe names only; write `needs new helper (<name>)` for a gap), `transition`, `reuse`, `new assets`. Under it, write the `scene.md` text. The builder copies that text word for word.
2. Collect the gaps before you build. Every `needs new helper` becomes klappe work, and it is done first.
3. Build the shared parts once (frames, repeated scenes, deck helpers outside `sections/`). Prove them on two or three pilot scenes. Start the fan-out only after the deck owner approves the look.
4. Fan out with one builder per chapter. Each builder owns its section folders and runs its own dev port. A builder never edits shared parts: it lists the changes it wants in its hand-back. It runs `npm test` and `?selftest=walk`, deep-links each scene's last step, takes screenshots at 1920x1080 and 1366x768, and commits by path.
5. Review with three read-only reviewers in parallel: content (text matches `scene.md`, facts, sources), look (design rules, overlap, safe area, contrast) and tech (the timeline rule, handles, steps). Give them one output format: a first line `VERDICT: PASS` or `VERDICT: FAIL`, then one line per finding as `file:line — severity — problem — expected`, and at most five top fixes. Pass them a list of known and accepted points, so nothing is reported twice.
6. Merge all findings into one fix list per round, in one file. Run one fix round on it. Then the deck owner walks the deck.
7. When a text changes, change it in `scene.md` and in the storyboard. A `scene.ts` that reads `ctx.doc` follows by itself.
