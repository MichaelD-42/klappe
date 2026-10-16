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
It covers spec examples A (old way), B and C (where we are). Boot, Coming together and Working on the topic come in M2.

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
- A `### Question?` followed by a paragraph is a shout-out. It makes 4 steps: enter, hold, fade, answer.
- A scene with no list items gets one step with the title.

### scene.ts

Use `import type { SceneModule } from "klappe/types"`. Export a default `SceneModule`.

- `place(rects)` returns the scene's home frame. The engine flies the camera there when the scene starts. `rects` are the canvas rects from the section.
- `build(ctx)` creates all DOM, hidden. Return the refs you need. Steps receive them.
- `steps` is an array with one function or `null` per step. A step function is `(tl, refs, ctx) => void`.
- In a step, only add tweens to `tl`. Do not use `.from()`. Do not change the DOM in callbacks.
- Use `ctx.camera.to(tl, rect, { duration, at })` for camera moves inside a scene, after the entry.
- Keep one master timeline per canvas. The engine owns it.

### section.ts

Export a default `SectionModule`. `build(ctx)` draws the backdrop for the whole canvas and returns refs and rects. Scenes read them from `ctx.canvas.refs` and `ctx.canvas.rects`.

### Types in deck repos

Import types from `"klappe/types"`. `klappe init` writes a `tsconfig.json` with this mapping if none exists:

```json
{ "compilerOptions": { "paths": { "klappe/types": ["./klappe/src/types"] } }, "include": ["decks"] }
```

If you have your own `tsconfig.json`, add the `paths` entry yourself.

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
