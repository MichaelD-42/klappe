<p align="center"><img src="docs/klappe-icon.png" width="160" alt="klappe icon: a film clapperboard"></p>

# klappe

[![CI](https://github.com/MichaelD-42/klappe/actions/workflows/ci.yml/badge.svg)](https://github.com/MichaelD-42/klappe/actions/workflows/ci.yml)

CI runs the typecheck, the lint tests and the unit and browser tests on every pull request and push to `main`; a green `main` deploys the demo deck to [GitHub Pages](https://michaeld-42.github.io/klappe/).

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

klappe ships agents and the `klappe` skill in `klappe/.claude/`.
Claude Code does not find a `.claude` folder nested in a subfolder.
So `klappe init` and `npm run klappe:sync` copy the `klappe*` agents (and any `klappe*` skills) to `.claude/` in the deck repo root.
Run `npm run klappe:sync` after every klappe update. It overwrites the copied files. It never deletes. Remove stale `klappe*` files in `.claude/` by hand.

## Presenting

Open the deck full screen (F11) and press `N` for the speaker view in a second window.
A laptop with desktop animations turned off asks browsers for reduced motion, and klappe then cuts every camera move and leaves out the slow push on pictures.
To present with full motion anyway, open the deck with `?reducedmotion=0`, for example `http://localhost:5173/?reducedmotion=0`. The other keys and URL flags are in [deck format](docs/reference/deck-format.md#keys).

## Reference

The deck format, the effects, the themes and the keys are in [docs/reference](docs/reference/index.md).
