# Backlog next 10

The next ten entries of `docs/backlog.md`, built one per task on branch `feat/backlog-next10`. No separate spec: the backlog entry text quoted in each task, the repo's `CLAUDE.md` rules and `DECISIONS.md` are the authority. Built in dependency order (tokens before what derives them), not backlog order.

## Global Constraints

- Test first: a failing test for each criterion, then the code. Unit tests in `tests/unit/`, browser behaviour in `tests/e2e/`, a small option on an existing effect in `src/deck/fixtures/fx-options.ts` and `tests/e2e/fx-options.e2e.test.ts`.
- Seek must equal play. Anything on a timeline is a pure function of the step; anything on the wall clock sits under `data-k-ignore`, holds still with reduced motion and in the self-test. `?selftest=walk` must stay green.
- Effects take colours only from `--k-*` tokens. A new token gets a line in `docs/reference/themes.md` and a default in `src/themes/calm.css`.
- A new `klappe/fx` export needs a heading in `docs/reference/`, a call in the demo catalog (a section from `100-catalog` on), and a row in the skill's "Choose the element by intent" table (`.claude/skills/klappe/SKILL.md`), or the lints fail. Scene ids are unique across the whole demo deck: grep before naming one.
- Every user-visible change gets a line in `CHANGELOG.md` under the open version at the top. A choice someone will later question gets a `DECISIONS.md` entry. When a task is done, delete its entry from `docs/backlog.md`.
- No new npm dependency. Visible changes: `npm run shot -- <section>/<scene>` and read the PNGs. e2e tests assert properties, never where text wraps.
- Design rules: no cream or off-white backgrounds, no italic accent words in headlines, no numbered "01/02/03" labels, no monospace labels, no pill-shaped buttons.
- Match the surrounding code's style and comment density. Minimum code that meets the criteria.
- Run `npx tsc --noEmit`, `npx vitest run --project unit` and the e2e files you touched before committing.

## Task 1: Spacing and shape tokens

Backlog: "Spacing and shape tokens: gaps, corner radius and stroke weight as `--k-*` tokens, so a brand with sharp corners and wide whitespace can say so."

Criteria:
- New tokens `--k-radius` (box corner radius), `--k-stroke` (diagram stroke weight) and `--k-gap` (the gap between boxes in a laid-out element), with defaults in `calm.css` equal to the values the effects use today, so every built-in theme looks the same as before.
- The effects in `src/fx/` that draw `--k-surface` boxes, diagram strokes and box gaps read these tokens instead of literals. Find the literals with grep; where an effect computes geometry in JS from a gap or stroke, read the resolved token (as the type-scale tokens `--k-size-*` are read) rather than leaving a literal.
- A lint (extend `tests/lint/design.test.ts`) fails on a literal `border-radius` or `stroke-width` in `src/fx/` CSS/TS outside an allow list with a reason per entry.
- An e2e test sets the three tokens on a fixture and asserts a box's computed radius, a stroke's width and a gap follow.
- `docs/reference/themes.md` documents the three tokens. One demo theme or catalog scene shows a sharp, wide-spaced look (e.g. an `?theme=` deck theme in `decks/demo/themes/`, or a section override once Task 2 exists—use a deck theme here).

## Task 2: Section rhythm

Backlog: "Section rhythm: a `section.ts` token override (an inverted or dark section, a picture section between diagram sections), so a deck can pace like a magazine. Today the theme is per deck."

Criteria:
- `section.ts` takes `tokens: { "--k-bg": "#…", … }`: `--k-*` custom properties applied to that section's scenes and its backdrop only. Keys not starting with `--k-` are a deck problem.
- The stage background behind the section's canvas follows `--k-bg` of the section while it is on screen (an inverted section reads as inverted edge to edge, not as boxes on the deck's background).
- The contrast rules in `docs/reference/themes.md` run on each section's resolved tokens too; a failure is a deck problem naming the section.
- e2e: a fixture with two sections, the second inverted; assert the computed `--k-bg`/colour of a scene in each, and that a deep link into the second section shows its background. The walk stays green.
- Demo catalog scene with an inverted section; `docs/reference/deck-format.md` under `section.ts`.

## Task 3: Brand theme

Backlog: "Brand theme: from a logo and two brand colours, derive a full `--k-*` theme that passes the contrast rules. The logo and footer go in `overlay.ts`."

Criteria:
- `klappe theme --deck <id> --name <name> --colors <hex1>,<hex2> [--logo <file>] [--light]` writes `decks/<id>/themes/<name>.css` with every colour token (bg, fg, muted, surface, line, accent, accent-2, ok, warn, bad, series 1–6, scrim). Brand colour 1 becomes the accent and 2 accent-2, each nudged in lightness only as far as needed to pass the contrast floors; bg/surface/fg/muted/line are derived from brand colour 1's hue (dark by default, light with `--light`, never cream or off-white). Series colours stay apart for colour-blind readers as the built-in themes do (reuse whatever check the repo already has for this).
- The derivation is a pure function in its own module with unit tests: for a set of brand pairs (including two near-identical colours, a very light yellow and a very dark navy) the output passes every contrast rule in `themes.md`, checked with the same contrast maths the runtime uses.
- With `--logo`, the file is copied to `decks/<id>/media/` and, if the deck has no `overlay.ts`, one is written with the logo bottom right and a footer text from the deck title (the documented `overlay.ts` example's shape). An existing `overlay.ts` is never overwritten; the command prints the snippet instead.
- An existing theme file of that name is not overwritten without `--force`.
- Documented in `docs/reference/themes.md` and the CLI help; architecture table row for `theme`.

## Task 4: Composition presets

Backlog: "Composition presets: named layouts in `scene.md` frontmatter beyond the default column and 45/55 text-and-media split (a rule-of-thirds split, a full-bleed picture with a caption, a big number with a footnote). An agent picks a named layout more reliably than it places pixels."

Criteria:
- `layout:` in `scene.md` frontmatter takes `thirds` (text in the left third, media in the right two thirds, on rule-of-thirds lines), `full-bleed` (the scene's picture fills the frame, the text as a caption on a scrim at the bottom), and `big-number` (the first step's number set very large, the rest as a footnote under it). Today's behaviour stays the default; an unknown name is a deck problem listing the names.
- The default renderer honours it; spacing uses `--k-gap` from Task 1 where it applies.
- e2e: each layout on a fixture asserts its geometry (the media rect is the right two thirds; the full-bleed picture covers the frame; the big number's font size is larger than `--k-size-title`), not text wrapping. The look checks (overflow, safe area) pass for all three.
- A demo catalog scene per layout, `docs/reference/deck-format.md` under `scene.md`, and the skill tells the author to pick a named layout before placing pixels.

## Task 5: Own icons at the repo level

Backlog: "Own icons at the repo level: a deck repo's `icons/` shared by its decks, as `themes/` is. A deck's own `icons/` works today."

Criteria:
- `icon(ctx, "name")` resolves `decks/<id>/icons/<name>.svg`, then `<deck repo root>/icons/<name>.svg`, then Lucide, in that order, the same lookup order themes use. The deck's own wins over the repo's.
- Works in dev, build, the scan plugin's virtual module and `outline`/`test` where icons matter.
- Test: a fixture repo-level icon is found; a deck icon of the same name wins. `docs/reference/deck-format.md` folders list and `docs/reference/effects.md` icon section updated.

## Task 6: Type as image

Backlog: "Type as image: one word or number set to fill the frame, edge to edge, optionally with a picture or video showing through the letters. `shout`, `kpi` and `counter` stay at text sizes; no effect clips media to text."

Criteria:
- A new `klappe/fx` export (name it in the existing naming style, e.g. `bigType`) that sets one word or number fitted to a given rect (default: the scene frame within the safe area), edge to edge, in `--k-font-heading`, colour from a token; with `media: "media/<file>"` an image or video shows through the letters (video loops on the wall clock under `data-k-ignore`, still with reduced motion). Returns `{ el, show }` like its siblings; `show` reveals it on the timeline, seekable.
- A missing media file behaves as `image`/`video` do (placeholder, deck problem, `media/TODO.md`), and `alt` is required with media.
- e2e: the text's rendered width fills the rect within a tolerance; media is clipped to the glyphs (computed `background-clip: text` or an SVG clip path); seek equals play.
- Reference heading in `docs/reference/effects.md`, a demo catalog scene, a skill table row.

## Task 7: Titling

Backlog: "Titling: a lower third (a name and role, or a quote's source) and an end roll of sources and thanks, built from the sources the deck's charts already record."

Criteria:
- `lowerThird(ctx, { name, role? })`: a bar at the lower left with a name and role, that slides in on `show()` and out on `hide()`, colours from tokens, inside the safe area.
- `endRoll(ctx, { title?, thanks?: string[] })`: a credits roll that scrolls on the timeline (seekable, so a deep link mid-roll shows the same frame as playing to it) and lists every source the deck records: every `# source:` line of a `data/` CSV and every `source` option given to `kpi`/`waffle`/chart-like effects that the deck passes. Find where these are collected today; if nothing collects them deck-wide, collect them at build time in one place, deduplicated, in deck order.
- Tests: a fixture deck with two charts with sources and one KPI source; the end roll lists all three once. Seek equals play for both effects.
- Reference headings, demo catalog scenes (an end roll at the end of the catalog's titling section), skill table rows.

## Task 8: Deck arc

Backlog: "Deck arc: a deck-level rubric in `.rubrics/` for the content reviewer (an opening hook, a through-line, set-ups paid off, one ask at the end), and a story view in `klappe outline` that prints each scene's story point in order. Needs the story point in `scene.md` frontmatter, not only in the storyboard outside the deck."

Criteria:
- `scene.md` frontmatter takes `story: <one sentence>`. Not required; the parser keeps it on the scene.
- `klappe outline --story` prints, in deck order, one line per scene with its deep link and story point (`(no story point)` where missing), and nothing else. Plain `outline` shows the story point under the scene title when present.
- `.rubrics/deck_arc.md` in the same frontmatter format as `.rubrics/scene_purpose.md` (`applies_to: [deck]`, `reviewer: content`), judging hook, through-line, set-ups paid off, one ask at the end, reading `outline --story`. It loads with the existing rubric loader and its tests (`loadRubrics`); extend their test if they enumerate rubrics.
- The demo deck's story scenes (sections before `100-catalog`) get `story:` lines. Docs in `deck-format.md`; the skill says to write the story point into the scene.

## Task 9: Rehearsal timing

Backlog: "Rehearsal timing: a rehearsal mode in the speaker view that records the time spent per scene and shows it against the plan (`duration` in `deck.md`, the `outline` estimate), so the talk's slow parts show from real runs."

Ruling from the user: recorded times live in the browser's `localStorage`, keyed by deck; nothing is written to the deck.

Criteria:
- The speaker view gets a rehearse toggle (key and button, in klappe's own strings in `en` and `de`). While on, it records wall-clock seconds spent on each scene from the step events it already receives; leaving a scene and coming back adds to it. Stored in `localStorage` under a key that includes the deck id; a reset clears it. Storage errors (private mode) are caught and rehearsal still works for the session.
- The speaker view shows, per scene, the last run's time against the plan: the per-scene estimate the outline uses (move `stepSeconds`/the estimate to a module both `bin/outline.mjs` and the browser can import, without changing outline's output), and the run total against `deck.md` `duration`. Over-plan scenes are marked with `--k-warn`/`--k-bad`.
- Unit tests for the accumulation (enter, leave, re-enter, reset) with an injected clock; an e2e test drives the speaker view with a fake clock or short waits and reads the stored record.
- Never on a canvas timeline; the main window's walk is unaffected. Docs in `deck-format.md` (Keys and the speaker view).

## Task 10: Video export

Backlog: "Video export: `klappe video` renders a deck to MP4 by stepping each canvas timeline frame by frame in Playwright, holding each step for its `auto` time or a default. Seek equals play, so a frame is exact; wall-clock loops (backgrounds, `mesh3d`, video) need their own clock in this mode. Check first whether the frames can feed ffmpeg without a new npm dependency."

Ruling from the user: encode with the system `ffmpeg` from `PATH`; if it is missing, fail with a clear message naming it. No npm dependency.

Criteria:
- `klappe video [--deck <id>] [--out <file.mp4>] [--fps 30] [--hold <s>] [--size 1920x1080]` opens the deck with the same Playwright helpers `pdf`/`shot` use (`openDeck`), and for each step seeks the canvas timeline at frame times from the step's start to its end, then holds the final frame for the step's `auto` time or `--hold` (default 3 s). Canvas changes include the transition, rendered by seeking its timeline the same way where it has one; where it does not, cut and document it.
- Frames are piped as PNG (or raw) to `ffmpeg` on stdin; output is H.264 MP4, yuv420p, at the given fps.
- Wall-clock loops: v1 holds them still as reduced motion does, and the docs say so; DECISIONS.md records it as the chosen limit. (Ruling: a frame-driven clock for every loop is out of scope for v1.)
- A missing ffmpeg exits non-zero with `klappe video needs ffmpeg on PATH`.
- Test: an e2e/CLI test renders a two-scene fixture at a low fps and size, then checks with `ffprobe` the duration (within one frame of the expected sum) and the size. Skip only if `ffmpeg` is absent, with a visible skip reason.
- CLI help, architecture table row, `docs/reference/deck-format.md` or a new reference section, CHANGELOG.
