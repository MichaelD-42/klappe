# klappe

klappe is a framework for presentations. It uses Vite, TypeScript and GSAP.
A deck repo holds your decks and includes klappe as a git subtree in the `klappe/` folder.

## New deck repo

1. Create the repo and an empty first commit.

```sh
git init
git commit --allow-empty -m init
```

1. Add klappe as a subtree.

```sh
git subtree add --prefix klappe https://github.com/MichaelD-42/klappe.git main --squash
```

1. Create the deck. This makes `decks/<id>/`, a root `package.json` and the Claude agents in `.claude/`.

```sh
node klappe/bin/klappe.mjs init --deck <id>
```

1. Install the packages.

```sh
npm i
```

1. Build the deck. The result is `dist/<id>/index.html`.

```sh
npm run build -- --deck <id>
```

`init` refuses to run if `decks/<id>/` exists. If `package.json` exists, `init` keeps it and adds the klappe dependency and scripts.
Other commands: `npm run dev`, `npm test`.

## Update klappe

1. Commit or stash your changes.
2. Pull the latest klappe.

```sh
git subtree pull --prefix klappe https://github.com/MichaelD-42/klappe.git main --squash
```

1. Run `npm i`.
2. Run `npm run klappe:sync` to refresh the Claude agents.

## Push a fix back

1. Commit the fix to `klappe/` in its own commit. Touch no other folder in that commit.
2. Push the subtree to a branch.

```sh
git subtree push --prefix klappe https://github.com/MichaelD-42/klappe.git my-fix
```

1. Open a pull request for `my-fix` in the klappe repo.

## Claude agents

klappe ships agents and skills in `klappe/.claude/`.
Claude Code does not find a `.claude` folder nested in a subfolder.
So `klappe init` and `npm run klappe:sync` copy the `klappe*` agents and skills to `.claude/` in the deck repo root.
Run `npm run klappe:sync` after every klappe update. It overwrites the copied files.
