# klappe

klappe is a framework for presentations. It uses Vite, TypeScript and GSAP.
A deck repo holds your decks and includes klappe as a git subtree in the `klappe/` folder.

Prerequisites: Node and npm, Git (Git Bash on Windows). Run `npx playwright install chromium` once per user.

## New deck repo

1. Create the repo and an empty first commit.

```sh
git init
git commit --allow-empty -m init
```

2. Add klappe as a subtree.

```sh
git subtree add --prefix klappe https://github.com/MichaelD-42/klappe.git main --squash
```

3. Create the deck. This makes `decks/<id>/`, a root `package.json` and the Claude agents in `.claude/`.

```sh
node klappe/bin/klappe.mjs init --deck <id>
```

4. Install the packages.

```sh
npm i
```

5. Build the deck. The result is `dist/<id>/index.html`.

```sh
npm run build -- --deck <id>
```

`init` refuses to run if `decks/<id>/` exists. If `package.json` exists, `init` keeps it and adds the klappe dependency and scripts.
Other commands: `npm run dev`, `npm test`.
If the repo has several decks, add `-- --deck <id>` to each command.

## Update klappe

1. Commit or stash your changes.
2. Pull the latest klappe.

```sh
git subtree pull --prefix klappe https://github.com/MichaelD-42/klappe.git main --squash
```

3. Run `npm i`.
4. Run `npm run klappe:sync` to refresh the Claude agents.

## Push a fix back

1. Commit the fix to `klappe/` in its own commit. Touch no other folder in that commit.
2. Push the subtree to a branch.

```sh
git subtree push --prefix klappe https://github.com/MichaelD-42/klappe.git my-fix
```

3. Open a pull request for `my-fix` in the klappe repo.

## Claude agents

klappe ships agents in `klappe/.claude/`. Skills are deferred: they will be written from experience after a few real decks.
Claude Code does not find a `.claude` folder nested in a subfolder.
So `klappe init` and `npm run klappe:sync` copy the `klappe*` agents (and any `klappe*` skills) to `.claude/` in the deck repo root.
Run `npm run klappe:sync` after every klappe update. It overwrites the copied files. It never deletes. Remove stale `klappe*` files in `.claude/` by hand.

## Deck format

Quick reference. The demo deck in `decks/demo` shows every rule.
It covers spec examples A (old way), B (value stream), C (global team). Boot, Coming together and Working on the topic come in M2.

### Folders

Use numeric prefixes. They set the order. The prefix is not part of the id.

```
decks/<id>/
  deck.md
  sections/
    10-opening/
      section.md          # "# Title", optional "> notes"
      section.ts          # optional: canvas-wide backdrop
      10-old-way/
        scene.md
        scene.ts          # optional
```

### deck.md

Frontmatter keys:

- `title`: required.
- `lang`: default `en`.
- `theme`: `calm` or `bold`. Default `calm`.
- `intensity`: `calm` or `bold`. Default is the theme.
- `confidential`: `true` or `false`. Default `false`.
- `shared-canvas`: section ids that share one canvas, for example `[value-stream, global-team]`. Use a list of lists for several groups.

### scene.md

- `## Title` names the scene. It is required.
- Each list item is one step.
- A `> note` is a speaker note. It belongs to the step above it. Before the first step, it belongs to the scene.
- A `### Question?` followed by a paragraph is a shout-out. The heading must end with `?`. It makes 4 steps: enter, hold, fade, answer. A `> note` after it attaches to the answer step.
- A scene with no list items gets one step with the title.
- A list item with `![alt](media/x.png "prompt")` shows an image. A link to YouTube, Vimeo, or a `.mp4` or `.webm` file shows a video. A link to `data/x.csv` or `data/x.json` shows a chart. The link shows as its label in the text. Without `scene.ts` `build()`, the text goes in a left column and the media on the right.

### scene.ts

Use `import type { SceneModule } from "klappe/types"`. Export a default `SceneModule`.

- `place(rects)` returns the scene's home frame. The engine flies the camera there when the scene starts. `rects` holds the home frames of the scenes before this one on the same canvas, keyed by scene id. Use it to place a scene relative to an earlier one. Without `place()`, a scene gets a 1920x1080 frame at x = its position on the canvas times 1920.
- `build(ctx)` creates all DOM, hidden. Return the refs you need. Steps receive them.
- `steps` is an array with one function or `null` per step. It lines up with the list items by position. `null` or a missing entry gives the default step, which shows the step text. A step function is `(tl, refs, ctx) => void`.
- In a step, only add tweens to `tl`. Do not use `.from()`; use `fromTo`. Do not change the DOM in callbacks, with one exception: `onUpdate` may write the DOM as a pure function of the tween's progress. Mark such an element with `data-k-text` (text) or `data-k-progress` (a progress value), so the self-test compares it.
- Do not use negative or `<` offsets (such as `"<"` or `"-=0.5"`) for a tween position in a step. A step starts at its own label, and an offset before it can pull the tween into the previous step. Use `at` values of 0 or more, or labels.
- Use `ctx.camera.to(tl, rect, { duration, at })` for camera moves inside a scene, after the entry.
- Keep one master timeline per canvas. The engine owns it.

### section.ts

Export a default `SectionModule`. `build(ctx)` draws the backdrop for the whole canvas and returns refs. Scenes read them from `ctx.canvas.refs`. `ctx.canvas.rects` holds each scene's home frame, keyed by scene id. The layout supplies it, not the section.

- `transition` sets how the deck enters this section when it moves forward by one step onto a new canvas. Default `fade`. A back move, a jump and `?instant=1` always cut.
- `zoomTarget` names a ref on the old canvas for `transition: "zoom"`.
- `transitionOptions` passes extra options to the transition, for example `{ shards: 20 }`.

### Effects

Import effects from `"klappe/fx"`, for example `import { shatter, crt, chart } from "klappe/fx"`.

- A helper is `name(ctx, opts)`. Call it in `build()`. It builds its DOM, hidden, in `ctx.svg` or `ctx.html`.
- A helper's `rect` and `x`, `y` are scene-local: the origin is the top-left of the scene frame, in 1920x1080 units.
- Files that ship with the effects import from `klappe/fx/...`, for example `klappe/fx/art/engineer-desk.svg?raw`.
- It returns a handle with named steps, for example `{ crack, crack2, fall }`. Each one is `(tl) => void` and only adds tweens. Call them from your step functions.
- Helpers: `shatter`, `crt`, `drawOn`, `lineArt`, `icon`, `iconTile`, `shout`, `chart`, `parseCsv`, `worldMap`, `figure`, `swarm`, `morph`, `bubble`, `counter`, `image`, `video`.
- Transitions for `section.ts`: `cut`, `fade`, `blackout`, `zoom`, `shatter`, `crt`. A transition that fails plays `fade` and logs the error.
- `ctx.files.data` and `ctx.files.media` hold the deck's `data/` files (text) and `media/` files (URL), keyed like the link: `"data/x.csv"`.
- `ctx.problem(msg)` reports a deck problem. `ctx.onStep(fn)` hears every move; video uses it to play and pause.

### Types in deck repos

Import types from `"klappe/types"` and effects from `"klappe/fx"`. `klappe init` writes a `tsconfig.json` with these mappings if none exists:

```json
{ "compilerOptions": { "strict": true, "noEmit": true, "types": ["vite/client"], "paths": { "klappe/types": ["./klappe/src/types"], "klappe/fx": ["./klappe/src/fx"], "klappe/fx/*": ["./klappe/src/fx/*"] } }, "include": ["decks"] }
```

If you have your own `tsconfig.json`, add the `paths` entries yourself.

### Keys

- Next: Right arrow, Space, Page Down, Enter, click.
- Previous: Left arrow, Page Up.
- Home, End: first and last step.
- `O`: overview. `S`: section list. `N`: speaker view. `A`: autoplay. `Esc`: close a panel.

### URL flags

- `?instant=1`: every play becomes a seek.
- `?reducedmotion=1`: camera moves become cuts.
- `?autoplay=1`: start autoplay.
- `?speaker=1`: open the speaker view.
- `?selftest=walk` or `?selftest=ac`: run the self-test.

### Deep links

Use `#/section/scene/step`. The step number starts at 1. Example: `#/value-stream/clarification/2`.
