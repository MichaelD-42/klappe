# klappe: framework design and plan

## Context

klappe is a browser engine for animated, cinematic storytelling presentations. The source requirements are in `docs/storyteller-init-prompt.md`; this document is called "the spec" below. This file adds the decisions made in conversation on 2026-10-16.

The predecessor is claude-advisor's AI@RD engine (`C:\workspace\claude-advisor\topics\ai-at-rd\presentation-v2`). It works, but it became slow and expensive to change:

- Every chapter edits shared files: the script list, the hand-placed `ZONES` table in `camera.js`, `selftest.js` and `ui.js`.
- Stepping back means a full instant replay.
- There is no browser back/forward.
- About 17 review rounds went to framing and legibility at 1366×768.

klappe fixes this: cheap edits, and many agents working on one deck in parallel without conflicts.

**First users:**

- **Hackathon training.** Bold intensity; the effect should be "I can do this with AI?!".
- **AI@RD strategy for senior management.** Calm intensity; a non-technical audience must understand what AI changes in our value chain.

Which deck goes first is decided after the framework is done. Until then, the demo deck (spec §4 examples A–C) is the test bed.

**Order of work:**

1. The framework.
2. Then the real decks (a separate brainstorm). Decks are made by a human and Claude together, using the build-loop agents.
3. Skills come later, written from experience (see Skill).

## Decisions (user-confirmed)

| Topic                | Decision                                                                                                                                                                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stack                | Spec stack: Vite + TypeScript + GSAP + D3 (scales, shapes and axes only) + a Markdown parser. npm works through px (verified: `npm view gsap` → 3.15.0, `vite` → 8.3.4).                                                                                                                                                                                           |
| Deck layout          | One folder per scene; ordering by folder-name prefix; no registry file (see below).                                                                                                                                                                                                                                                                                |
| Sharing              | **git subtree.** klappe lives at `https://github.com/MichaelD-42/klappe.git`. Each deck repo has it at `klappe/`. Update with `git subtree pull --prefix klappe <url> main --squash`. Local fixes go back with `git subtree push`.                                                                                                                            |
| Images               | No API: the image spike found M365 Copilot has no image API (sources below). When a scene needs an image, Claude writes the prompt and the target path into `media/TODO.md`, and the scene shows a visible placeholder. The human makes the image in Copilot and saves it at that path; the placeholder disappears. The image-provider interface stays as spec §6. |
| Lessons from advisor | Do it better: no shared registration points, real reverse stepping, back/forward, built-in framing checks.                                                                                                                                                                                                                                                         |

## Design

### Deck folder (in a deck repo)

```text
klappe/                      # subtree: the framework
decks/<deck-id>/
  deck.md                    # frontmatter only: title, lang, theme, intensity, confidential, shared-canvas
  sections/
    10-value-stream/
      section.md             # "# Value stream" (+ optional section notes)
      10-overview/
        scene.md             # "## Overview", list = steps, > = notes, ### …? = shout-out
        scene.ts             # optional: build(), steps choreography, place()
      20-analysis/scene.md
  data/  media/  sources/
  media/TODO.md  data/TODO.md   # generated: missing images (with prompts) and missing data
package.json                 # "klappe": "file:./klappe"; scripts dev/build/test
```

- **Discovery.** `import.meta.glob('/decks/*/sections/**/scene.{md,ts}')` finds every scene. Adding a scene touches no shared file.
- **Ids.** A scene id is its folder name minus the numeric prefix (`20-analysis` → `analysis`). The id stays stable when a heading changes. A duplicate id is a build error.
- **scene.md format.** Plain Markdown, as in spec §3, so a deck can still be read as a rehearsal script.

### Engine (`klappe/src/`)

Modules follow spec §7: parser, world/renderer interface, camera, timeline/stepper, router, speaker view, overview, section selector, charts, shout-out, media, themes, export.

- **Timeline rule (the key change from advisor):**
  - Each scene's DOM and SVG exist at load, hidden.
  - **One master GSAP timeline per canvas.** Each scene adds its segment in folder order, with one label per step. A deep link seeks the canvas timeline, so state left by earlier scenes on the same canvas comes back by itself.
  - `run` never creates elements.
  - goto(step) = `seek(label)`. Forward = play to the next label.
  - **Back = cut (or a fade of about 200 ms) to the end state of the previous step.** User decision. Effects only need to be seekable, not reversible. Back across a canvas transition cuts too.
  - Auto-play is the same timeline with per-step holds.
  - Instant mode (`?instant=1`) seeks without tweening. Tests use it, and `prefers-reduced-motion` uses it for camera cuts.
- **Layout.**
  - Default: each section is a canvas, and scene _i_ sits at `x = i × 1920` on a 1920×1080 grid.
  - `scene.ts` can export `place()` to put a scene elsewhere.
  - Sections listed in `shared-canvas` are laid out on one canvas.
  - There is no hand-made zone table.
- **Canvas-wide content** (the value stream in Example B, the map in Example C):
  - It lives in an optional `section.ts` next to `section.md`. That file's `build()` draws the backdrop and returns named refs (`stages.analysis`, …).
  - Scenes reach those refs via `ctx.canvas.refs`.
  - This is one shared file per section, not per deck, and it is edited rarely. _My call; it keeps the parallel model at scene level._
- **One deck per build.**
  - A repo may hold several decks under `decks/`.
  - `npm run dev -- --deck <id>` and `npm run build -- --deck <id>` choose one.
  - The hash needs no deck id, and ids must be unique only within a deck. _My call._
- **Router.**
  - Hash format: `#/<section>/<scene>/<step>`.
  - Each step change calls `pushState`, so browser back/forward work.
  - The `hashchange → goto` path has a re-entry guard.
- **Speaker view.**
  - `?speaker=1`, synced over BroadcastChannel, with a fallback to `window.opener` postMessage. BroadcastChannel between two `file://` windows is unverified; M3 tests the single-file build for this. _My call._
  - Shows notes, the current step, the next step and elapsed time.
  - Either window can step.
- **Error capture.**
  - `onerror` and unhandled rejections go into `klappe.errors`.
  - The idea is ported from advisor `core.js`.
- **Placeholders.**
  - Missing data shows "DATA MISSING"; missing media shows "IMAGE MISSING".
  - Both are visible on screen and listed in the TODO files.
- **Themes.**
  - Design tokens as CSS variables plus a motion-token object.
  - Two themes: `calm` and `bold`. The calm theme uses quiet colour tokens: navy background, blue accent.
  - The theme design rules from spec §2 apply.

### Delivery

- `vite dev`.
- `vite build` → a static folder.
- `build --single` → one HTML file that opens by double-click.
  - All JS, CSS, fonts and images are inlined; videos stay as links.
  - Implementation: `vite-plugin-singlefile` (approved).
- No CDN calls at runtime.
- PDF export: one screenshot per step, merged into a PDF. It uses the browser driver chosen in M0.

### Tests: one contract, three layers, swappable browser driver

1. **Unit (Vitest, Node).** Parser, slug and ids, router, camera maths, auto-layout, theme tokens.
2. **Integration (in the page).**
   - `?selftest=walk&instant=1` walks every step of a deck.
   - It checks: no errors captured, each step's optional `check()`, and that state after walking forward to step N equals state after deep-linking to N.
   - It writes JSON into `<script id="klappe-selftest">`; this idea is from advisor's `selftest.js`.
   - The driver only opens a URL and reads that element.
3. **Acceptance.**
   - One test per spec §9 criterion, `AC-1…AC-8`, run on the demo deck.
   - Speaker sync is tested by loading the speaker view in a same-origin iframe; BroadcastChannel works there.
   - 60 fps is a **manual** check.
4. **Deck lint.** A port of advisor `lint.mjs`, extended:
   - Design rules and no external URLs.
   - A size cap on the single file.
   - Minimum rendered font size at a 1366×768 viewport.
   - Text boxes must sit inside their frame.
   - Lists missing media and data.

### Skill

Deferred: skills will be written from experience after a few real decks. The image-prompt workflow and the storyboard, build-scene, review-deck and convert-deck workflows move to "later, as skills from experience".

### Non-goals (v1)

- Audio and narration. Nothing in the design may block adding them later.
- A visual editor.
- Image generation through an API.
- A WebGL renderer. It must stay possible behind the renderer interface.

### Anti-goals

- Any shared file that every scene must edit.
- Numbers that aren't backed by data files.

### Left to the builder (my calls, marked)

- markdown-it rather than remark. Smaller; we need only tokens. _My call._
- Approved extra libraries: Vitest, vite-plugin-singlefile, world-atlas + topojson-client, lucide, plus @playwright/test (named in the spec). Ask before adding any other library.
- Fonts per theme. Libre Franklin (OFL) is the fallback, as in advisor.
- GSAP licence: free ("no charge") but not OSI open source. Record it in `DECISIONS.md`.

## Plan

**Step 0.** Write this design to `docs/superpowers/specs/2026-10-16-klappe-design.md`. Start `DECISIONS.md`. Commit on a feature branch.

### M0: Foundations and spikes (hard gate)

1. **Browser driver spike.**
   - Run `npm i -D @playwright/test` and `npx playwright install chromium`. The browser download comes from a CDN, not the npm registry, so check that px passes it.
   - Write a 10-line test that opens a page and reads the DOM.
   - Edge has `RemoteDebuggingAllowed=0`, but there is no `Policies\Chromium` key (verified), so Playwright's bundled Chromium may work.
   - **Pass:** use Playwright for integration, acceptance, PDF export and review-deck.
   - **Fail:** port `presentation-v2/test/edge.mjs` (headless Edge `--dump-dom`, `--screenshot`, `--virtual-time-budget`) behind the same driver interface.
2. **Skill and agent discovery spike.**
   - Check whether a nested `klappe/.claude/agents/x.md` shows up in a session started in the parent repo.
   - If not, `bin/sync-claude.mjs` copies the agents into the deck repo.
3. **Reviewer agents.** Write the four agent definitions first, so that M0's own scaffold already goes through the loop.
4. **Scaffold.** Create `package.json`, Vite + TS config, Vitest, the folder skeleton, and `npm test` running all layers.
5. **Subtree round trip.** Create a throwaway deck repo in the scratchpad. Run `git subtree add`, then `pull`. `npm i && npm run dev` must serve. Document the steps in `README.md`.

### M1: Engine core (fully detailed by writing-plans after approval)

- Build in this order: parser → discovery and ids → layout → camera → timeline/stepper → router → section selector → overview → speaker view → auto-play.
- Use TDD for parser, router, layout and camera.
- Demo: Example B (value stream) on its own canvas, plus one section on a second canvas.
- **Acceptance:**
  - AC-1…AC-8 from spec §9 pass headless.
  - Forward walk and deep link produce the same state at every step.
  - Browser back/forward work.
  - Lint passes at 1366×768.

### M2: Effects

- Stroke drawing.
- Characters on motion paths.
- Canvas swarm layer.
- Transitions: cut, fade, shatter, zoom-through, crack, CRT on.
- World map: `world-atlas` + `topojson-client`.
- Charts from CSV/JSON: bar, stacked, line, waterfall, timeline. "DATA MISSING" when data is absent.
- Shout-out, in calm and bold intensity.
- Video and GIF.
- Lucide icons.
- Image placeholder and `media/TODO.md`.
- **Accept:** examples A, B and C run; a selftest walk is clean.

### M3: Themes and delivery

- `calm` and `bold` themes.
- Static build and single-file build. The single file must open from `file://` with zero network requests, checked by the test.
- PDF export.
- Reduced motion.

### M4: Template and agents

- `template/`: a starter deck that the new-deck procedure copies.
- **Accept:** a fresh session in a new deck repo builds a scene from a storyboard and gets a green test run.

### Side spike (optional, needs IT): Work IQ A2A for images

- The Work IQ API (A2A / MCP / REST) exposes Copilot to agents.
- Its docs don't mention image generation.
- Test: call it once and ask for an image. If it returns an image file, add a provider behind the spec §6 interface.
- Blockers:
  - Usage-based billing, separate from the Copilot licence.
  - Entra app consent.
  - The `confidential` flag rule still applies.

### M5: First real deck

Brainstorm separately: hackathon or AI@RD.

## Build loop: orchestrator, builders, reviewers (user requirement)

The framework and every deck are built with the same loop.

1. **Orchestrator** (the main session).
   - Splits a milestone or deck into tasks, one module or one scene folder each.
   - Hands out the tasks and merges the results.
   - It alone touches shared engine files and `DECISIONS.md`.
2. **Builders** (subagents, one per task, each in its own git worktree).
   - Touch only their own folder.
   - Framework code is built test-first.
   - Hand back a green `npm test` and screenshots of the steps they touched.
3. **Three reviewers.** They run in parallel on each finished task, read only, and each returns findings plus a pass or fail.
   - **Technical.**
     - The tests are real and green.
     - The API contract and the timeline rule are kept.
     - No shared-file edits.
     - Performance: swarm sizes, node counts.
     - Deep link and walk give the same state.
   - **Look and feel.**
     - Looks at screenshots at 1920×1080 and 1366×768.
     - Checks the spec §2 design rules and theme tokens.
     - Checks framing and legibility, and that motion is smooth and has meaning.
     - Asks whether it is "wow" for bold decks or calm for board decks.
   - **Content.**
     - Is the story clear for the audience, for example one message per scene?
     - Every number has a source, with no invented facts.
     - Wording and notes.
     - Open TODOs: images, data.
     - For framework tasks: docs and the demo deck.
4. **Loop.**
   - The builder fixes the findings, and only the failed reviewers run again.
   - At most 3 rounds; after that the orchestrator escalates to the user.
   - Once all three pass, the orchestrator merges and runs the full `npm test`.

The parts ship in the framework so that deck repos get them through the subtree:

- `klappe/.claude/agents/`: `klappe-builder`, `klappe-review-tech`, `klappe-review-look`, `klappe-review-content`.

The same loop works for decks (a skill for it comes later):

- The human and Claude agree the storyboard.
- The orchestrator assigns one builder per scene.
- The three reviewers check each scene.
- The human gives the final review.

M0 checks agent discovery.

## Verification

- `npm test`: unit, integration selftest walk and acceptance AC-1…8 on the demo deck, plus lint.
- `npm run build -- --single`: open the output by double-click and check that the deep link `#/value-stream/clarification/2` lands exactly.
- Manual: smoothness at 60 fps, and how the speaker view feels with two real windows.

## Sources

- Image spike: [Chat API overview](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/api/ai-services/chat/overview) ("textual responses", no graphic art).
- Image spike: [Azure gpt-image-1.5](https://ai.azure.com/catalog/models/gpt-image-1.5).
- Image spike: [Copilot ToU](https://www.microsoft.com/microsoft-copilot/for-individuals/termsofuse) (no bots or scrapers).
- Advisor engine findings: `presentation-v2/src/engine/*.js`, `test/edge.mjs` L1-4, git log of claude-advisor.
