# M3 performance report: bundle size

Measured 2026-10-24 with `npx vite build` (Vite 8.3.4, Shiki 4.5.0) on a Linux cloud container (4 cores, Intel Xeon 2.8 GHz, Node 22). Sizes are minified bytes of the JS files in `dist/<deck>/assets/`; gzip is the sum of each file gzipped on its own. Frame times are in `docs/perf-m2.md`; M3 adds no new motion to measure.

"At start" is the JS the page fetches before the deck shows: the entry file and its static imports, plus the chunks `main.ts` loads before the first render (Shiki and its languages, when the deck shows code).

## Before and after Shiki

| Build | Demo deck at that commit | All JS | gzip | At start |
| --- | --- | --- | --- | --- |
| `06156c1~1`, before Shiki | M2 demo, no code scenes | 884 KB | 271 KB | 884 KB, one file |
| `06156c1`, Shiki installed, no `code()` yet | same | 888 KB | 273 KB | 888 KB, one file |
| `8ec5809`, `main` after M3 | M3 demo with catalog | 1,764 KB | 441 KB | 1,164 KB plus 601 KB of Shiki languages |
| this branch | same demo | 1,362 KB | 360 KB | 537 KB plus 767 KB of Shiki |

The first two rows build an older demo deck, so they show what Shiki's install cost (4 KB, nothing used yet), not what the M3 demo costs without it.

## Where the bytes go (this branch, demo deck)

- **Shiki: 767 KB, 56 % of all JS.** Core 110 KB, the JavaScript regex engine 57 KB, the nine language grammars 600 KB (TypeScript 177, JavaScript 171, Python 68, HTML 56, CSS 52, Bash 41, SQL 23, YAML 10, JSON 3). `loadHighlighter` loads every grammar, whatever languages the deck uses.
- **Shared chunk, 268 KB:** markdown-it with its helpers about 90 KB, the map (topojson-client and d3-geo) about 75 KB, and the effects the deck imports. Source maps attribute the bytes; the split is approximate.
- **Entry file, 105 KB:** the deck's own files (47 KB) and the engine. **gsap 68 KB. Chart with d3 65 KB.**
- **Self-test 13 KB and test fixtures 44 KB**: only for `?selftest=` and `?fixture=`.

## What the bundle work changed

| Deck | `main` (8ec5809) at start | this branch at start |
| --- | --- | --- |
| Demo (every effect, code scenes) | 1,164 KB + 601 KB languages | 537 KB + 767 KB Shiki |
| Markdown only (one scene, two bullets) | 674 KB * | 218 KB |

\* Measured after the icon change, before the lazy start; with every Lucide icon it would carry about 415 KB more.

- Lucide: only the icons a deck names are bundled (32 for the demo build, which also scans klappe's test fixtures). The full set was 415 KB.
- The Markdown-part effects, the `zoom`/`shatter`/`crt` transitions, Shiki, the self-test and the fixtures load only when the deck needs them.

## Not measured

- Load time on a real network. The demo is static files; GitHub Pages serves them gzipped.
- A further cut: load only the Shiki grammars a deck uses. A `scene.md` fence names its language; `code()` in a `scene.ts` would need its `lang` found by the build scan. Listed in `docs/backlog.md`.

## Commands

```sh
npx vite build --outDir /tmp/b --emptyOutDir                  # the demo
KLAPPE_DECK_DIR=<deck dir> npx vite build --outDir /tmp/b      # another deck
```
