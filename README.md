<p align="center"><img src="docs/klappe-icon.png" width="140" alt="klappe icon: a film clapperboard"></p>

<h1 align="center">klappe</h1>

<p align="center"><b>Animated presentations as code.</b><br>
Write scenes in Markdown, add motion in TypeScript, and present on one infinite canvas: the camera flies from scene to scene.</p>

<p align="center">
<a href="https://github.com/MichaelD-42/klappe/actions/workflows/ci.yml"><img src="https://github.com/MichaelD-42/klappe/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
<a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a><br>
<a href="https://michaeld-42.github.io/klappe/"><b>Live demo</b></a> ·
<a href="docs/reference/index.md">Reference</a> ·
<a href="CHANGELOG.md">Changelog</a>
</p>

<p align="center"><img src="docs/readme/tour.gif" width="800" alt="A tour of the demo deck: the camera flies along a value stream, a bar race reorders year by year, and a spotlight moves from one box of a flow diagram to the next"></p>

## Why klappe

klappe is for conference talks and other presentations where motion carries the message, from a keynote to an engineering walkthrough. A section is one large canvas, and each scene is a place on it, so the room sees how one idea connects to the next instead of a stack of separate slides.

Every step is a label on a GSAP timeline, and an effect only adds tweens to it. That one rule buys a lot: any step has a deep link (`#/section/scene/step`), jumping back and forth always lands on the same picture, the speaker view in a second window stays in sync, and a self-test walks every step to prove that playing a step and jumping to it look the same.

A deck is a folder of Markdown and TypeScript in git, so it diffs, reviews and merges like code. It is also easy for an AI agent to write: klappe ships a Claude Code skill and builder and reviewer agents that know the deck format and its rules.

It is not a WYSIWYG editor, and it does not export PowerPoint files. It does export a PDF, one page per scene with its links clickable, and an MP4 video.

## What you write

A scene is a folder. Its `scene.md` holds the steps: each list item is one click, a `> quote` is the speaker note.

````md
## Code walkthrough

> Explain the function one part at a time.

```js {1-2|3-5|6}
function total(items) {
  let sum = 0;
  for (const item of items) {
    sum += item.price;
  }
  return sum;
}
```

- Start the sum at zero.
- The loop adds each price.
- The function returns the sum.
````

That is a complete scene: the code is highlighted, and each click lights the next group of lines. When Markdown is not enough, a `scene.ts` next to it builds effects and gives each step its tweens:

```ts
import { chart, type ChartHandle } from "klappe/fx";
import type { SceneModule } from "klappe/types";

const scene: SceneModule = {
  build: (ctx) => chart(ctx, { src: "data/lead-time.csv", type: "slope", rect: { x: 160, y: 100, w: 1600, h: 820 } }),
  steps: [(tl, c: ChartHandle) => c.axes(tl), (tl, c: ChartHandle) => c.grow(tl), (tl, c: ChartHandle) => c.values(tl)],
};
export default scene;
```

## What's in the box

- **Markdown that animates:** bullets that step in, code walkthroughs, console sessions that type themselves, checklists, agendas, comparison tables, icons (`:rocket:`), shout-outs (`### Question?`), links, pictures, video and charts from a CSV link.
- **Charts and numbers:** bar, stacked, line, waterfall, timeline, donut, slope and bar race; KPI tiles with a sparkline, waffle, progress ring. Each reads a `data/` file and puts its source in the speaker notes.
- **Diagrams:** flow with travelling packets, a dependency graph laid out for you, sequence, swimlanes, decision tree, git history, mind map, fishbone, layer stack, a month calendar, world map with arcs, line art that draws itself, Lucide icons.
- **Pointing:** callout, numbered hotspots on a picture, spotlight, focus, a mouse pointer that clicks, types, drags and scrolls, hand-drawn marks (ring, underline, frame, strike, arrow).
- **Effects:** shatter, CRT, zoom and blackout transitions; shout-out, swarm, morph, counters, a decoding line, before/after wipe, people figures, a QR code.
- **Backgrounds:** pictures with a slow push, looping video, animated SVG files, an aurora, your own loop, parallax.
- **Presenting:** speaker view with rehearsal timing, overview, section list, autoplay, exercise timers, laser and pen, deep links, shorter cuts of one deck and an appendix for Q&A, opt-in sound, and reduced motion respected (with a `?reducedmotion=0` override).
- **Checks:** a missing picture or data file shows a placeholder on stage and a line in `media/TODO.md`; the self-test and a design lint run in CI.
- **Themes:** seven built in (`calm`, `bold`, `sorbet`, `lavender`, `daylight`, `forest`, `ink`; dark, light and pastel), built from `--k-*` tokens with bundled fonts; a deck can bring its own.

Every effect has a scene in the demo deck's catalog, the sections after the story. Open the [live demo](https://michaeld-42.github.io/klappe/) and press `S` for the list.

## Quick start

You need Node with npm and Git (Git Bash on Windows). A deck repo holds your decks and carries klappe as a git subtree in `klappe/`.

```sh
git init && git commit --allow-empty -m init
git subtree add --prefix klappe https://github.com/MichaelD-42/klappe.git main --squash
node klappe/bin/klappe.mjs init --deck my-talk     # decks/my-talk/ from klappe/template/, package.json, Claude agents
npm i
npx playwright install chromium                    # once per machine, for the tests and the PDF
npm run dev                                        # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | The deck on a dev server, with review mode (`R`). |
| `npm run build -- --deck my-talk` | A static site in `dist/my-talk/` with relative asset paths, so it works from any folder of a web server (not from `file://`, where browsers block its modules). |
| `npm run pdf` | `dist/my-talk.pdf`, one page per scene at its last step. Links, web and mail addresses and QR codes of links and online videos are clickable; a YouTube or Vimeo player prints as its still. `-- --width <px>` sets the pictures' pixels across (1920) and `--quality <1-100>` their JPEG quality (90): `--width 1280 --quality 75` makes a file about a third the size. `-- --handout` writes `dist/my-talk-handout.pdf` instead: one A4 page per scene, its last step with the speaker notes under it, to send after the talk. |
| `npm test` | The checks. `-- --only <section>[/<scene>]` walks only those scenes, in seconds, and prints their look warnings; `--bail` stops at the first failing step. |
| `npm run shot -- <section>[/<scene>[/<step>]]` | PNGs of those steps at 1920x1080 and 1366x768 in `dist/shots/my-talk/`; with no target, every step. `--last` shoots each scene's last step only, `--sheet` a contact sheet per section, `--theme <name>` another theme, `--size 1366x768` one size, `--at <ms>` a step that far into its play, `--url <dev server>` reuses a running `npm run dev`. |
| `npm run video` | `dist/my-talk.mp4`, the deck in full motion with each step held for its `auto` time or 3 s. `-- --out <file.mp4>`, `--fps`, `--hold <s>`, `--size <w>x<h>`, `--only <section>[/<scene>]` for a clip of those scenes. Needs `ffmpeg` on `PATH`. |
| `npm run outline` | The deck as text: every step with its note and deep-link ids, and a timing estimate against `duration` in `deck.md`. |

`outline`, `pdf`, `video` and `test` take `-- --cut <name>` for a cut from `deck.md` `cuts` (see [cuts and the appendix](docs/reference/deck-format.md#cuts-and-the-appendix)). With several decks in one repo, add `-- --deck <id>` to each command. `init` refuses to overwrite `decks/<id>/` and keeps an existing `package.json`, adding the klappe dependency and scripts.

## Presenting

Open the deck full screen (F11) and press `N` for the speaker view in a second window: the current step in large type, its notes, the next step, a clock and where you are (`12 / 40`). `P` there starts a rehearsal that times each scene.

| Key | Action |
| --- | --- |
| `→` `Space` `Enter` `Page Down`, click | next step (a presentation clicker sends these) |
| `←` `Page Up` | previous step |
| `Home` / `End` | first / last step |
| `O` / `S` | overview / section list |
| `N` | speaker view |
| `R` | review window (dev server only) |
| `A` | autoplay; any step key stops it |
| `T` | start or pause the scene's timer |
| `L` / `D` | laser dot / draw on the stage; again to turn off. Each step clears it |
| `Q` | to the appendix, and again back to where you were |
| `M` | mute or unmute the deck's sound |
| `Esc` | ink off, else close a panel |

The deck window keeps the screen awake while it shows, and a video starts on its step, so a clicker is all you need.

URL flags such as `?theme=bold`, `?autoplay=1` and `?selftest=walk` are in the [deck format](docs/reference/deck-format.md#url-flags).

## Reviewing a deck

Review mode is how you tell Claude Code what to change in a deck while you watch it, step by step. It is a loop of three moves.

1. **Write findings.** Run the deck with `npm run dev` and press `R`. A review window opens beside the deck and follows it: step in either window and both move. For the step on screen it shows a field each for **Content** (text to correct), **Storytelling** (another effect, another storyline) and **Visuals**. What you type is saved as you type to `decks/<id>/review.md`, one entry per step, with the step's text quoted so the finding stays tied to it. `R` also lets you drag or resize an element in the deck window, which writes the move as a Visuals finding, and, in a scene without its own `build`, double-click a step's text to fix a typo straight into `scene.md`.
2. **Let Claude work them.** Either after a pass, by asking Claude Code to "work through my review", or while you review: press **Send to Claude** when a step's findings are written, and keep a Claude Code session open that you told to "watch my review". It waits on `npm run review:wait` and picks up each sent step. Either way Claude fixes the finding, checks the scene, commits, and marks it `Fixed` with one line on what changed and the commit hash. When a finding is unclear it asks in the chat instead of guessing.
3. **Approve or reopen.** Back in the review window a fixed finding is read-only with Claude's line under it. **Approve** removes it from the file; **Reopen** takes a note on what is still wrong and the finding is open again for the next pass. The status line counts the fixes waiting for you.

The file is saved as you type, so a watching Claude takes only what you sent: change a sent finding and it is a draft again. Each fix commits and reloads the deck under you. Review mode exists only on the dev server; a built deck has no `R`. The details and the file format are in [review mode](docs/reference/deck-format.md#review-mode).

## Keeping klappe up to date

klappe follows semantic versioning: from 1.0.0 only a major version changes the deck format, the `scene.ts` API or the CLI in a way that breaks a deck, and the [changelog](CHANGELOG.md) lists each such change under **Changed**. Releases are `vX.Y.Z` tags on `main`.

```sh
git subtree pull --prefix klappe https://github.com/MichaelD-42/klappe.git main --squash
npm i
npm run klappe:sync    # refresh the Claude agents and skill
```

Claude Code does not find a `.claude` folder nested in `klappe/`, so `init` and `klappe:sync` copy the `klappe*` agents and skills to the deck repo's `.claude/`. A sync replaces those copies and leaves your own agents alone.

To send a fix back, commit it to `klappe/` alone, then push the subtree to a branch and open a pull request:

```sh
git subtree push --prefix klappe https://github.com/MichaelD-42/klappe.git my-fix
```

## Documentation

- [Reference](docs/reference/index.md): the deck format, every element and effect, themes, motion and the timeline rule.
- [Markdown triggers](docs/reference/markdown.md): what `scene.md` does without any code.
- [Decisions](DECISIONS.md): why klappe works the way it does.
- [Backlog](docs/backlog.md): what is planned and what is known to be missing.

## License

[MIT](LICENSE) © Michael Dold
