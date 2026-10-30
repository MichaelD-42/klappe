# {{id}}

A klappe deck. `deck.md` holds the settings, `sections/` the scenes in folder order, one folder per scene with its `scene.md` (and a `scene.ts` for animation).

- `data/`: the numbers charts read (CSV), each with its source. `klappe test` lists what is missing in `data/TODO.md`.
- `media/`: pictures and video. A missing one gets a prompt in `media/TODO.md`.
- `shared/`: helpers several scenes import (`../../../shared/x`); not loaded as scenes.
- `deck.css`: fonts, token overrides and classes for the deck's own look.
- `overlay.ts` (optional): what stays on screen over every scene, such as a logo.

`max-words: 12` in `deck.md` makes `klappe test` fail a step whose text runs longer. Raise it or remove it if this talk needs more.

From the repo root:

```
npm run dev                # the deck in the browser, reloading as you edit
npm test                   # the checks; -- --only <section>[/<scene>] walks those scenes in seconds
npm run shot -- <section>  # PNGs of those steps in dist/shots/, to look at what changed
npm run outline            # the deck as text, with a timing estimate
npm run pdf                # one page per step; -- --handout for one page per scene with the notes
npm run klappe:sync        # after updating klappe: refresh the Claude agents and the klappe skill
```

With several decks in the repo, add `-- --deck {{id}}` to each command. A folder starting with `_` is parked: it stays on disk and out of the deck.
