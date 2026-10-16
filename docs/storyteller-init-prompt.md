# Init prompt: Animated storytelling presentation engine

Paste this into Claude Code in an empty repo (or the repo of the earlier POC). Start in plan mode. Propose the plan first. Write code only after I approve the plan.

---

## 1. Goal

Build a browser-based presentation engine for animated storytelling in a business context.
A speaker uses it live to explain and train. Later it also runs as self-paced training.

Audiences:
- Technical trainings and presentations.
- VP and board-level presentations.

Authoring model: I write decks together with you (Claude Code). Decks are created agentically. There is no visual editor.

## 2. Hard requirements

### Presenting
- Manual stepping is the main mode. Each click or key press plays the next step.
- Auto-play is the same timeline, advanced by per-step timers. Manual input pauses auto-play.
- Speaker view in a second window, synced over BroadcastChannel: notes, current step, next step, elapsed time.
- Overview: shows all canvases, each zoomed out, with clickable markers for scenes.
- Section selector: jump to any section from a menu.
- Deep links: every scene, and every step, has its own URL. Use hash routing, for example `#/section-id/scene-id/3`.
- Browser back and forward move through the URL history.

### Visual model
- Content lives on canvases. A canvas is a large "world", rendered as SVG. Text and UI elements live in an HTML layer on top.
- By default, each section has its own canvas. Several sections can share one canvas when the story moves through one connected space.
- Moving between canvases uses a scene transition (cut, fade, shatter, zoom-through). Moving within a canvas uses the camera.
- Deep links, the section selector and the speaker view work the same, no matter how sections map to canvases.
- A camera moves across the world: pan, zoom, rotate. Use GSAP timelines and easing.
- Camera moves must support cinematic effects: fly-by, fly-over, slow push-in, hold, pull-back to the big picture.
- Build-up drawing: lines and shapes draw themselves (SVG stroke animation), elements fade and move in.
- Keep the renderer behind an interface, so a Canvas/WebGL renderer can replace SVG later if large worlds get slow.

### Charts
- Charts draw themselves step by step: axes, then bars growing, lines drawing, values counting up.
- Use D3 only for scales, shapes and axes. Use GSAP for all motion.
- Chart types for v1: bar, stacked bar, line, waterfall, timeline. Keep the chart module open for more (Sankey later).
- Data comes from CSV or JSON files next to the deck.
- Every chart records its data source (file and origin). Never invent numbers. If data is missing, render a visible "DATA MISSING" placeholder and list it in a TODO file.

### Shout-out questions
A shout-out is one question that dominates the screen.
- Phase 1, enter: the question builds in with an effect.
- Phase 2, hold: the question hangs on screen while I talk. Build tension: background dims, slight slow scale, optional vignette or blur.
- Phase 3, fade: the question fades out.
- Phase 4, answer: the answer builds in.
- In manual mode, each phase moves on my click. In auto-play mode, each phase has a timer.
- Intensity is configurable per deck and per shout-out: `calm` (board level) or `bold` (training).

### Media
- Videos are referenced by link, not embedded in the build: YouTube, other online sources, or local files.
- A video starts when its step starts and pauses when the step ends.
- Online videos need an internet connection. Local video files work offline.
- Animated GIFs.
- Images and icons. Use an SVG icon set with a permissive license (for example Lucide). Icons must take the theme colors.

### Themes
- Style and color templates as design tokens (colors, fonts, spacing, motion durations, easing curves).
- Theme is chosen per deck in the frontmatter. Ship at least two themes: one calm for board level, one lively for trainings.
- Design rules for all themes: no cream or off-white backgrounds, no italic accent words in headlines, no numbered "01/02/03" section labels, no monospace labels, no pill-shaped buttons.

### Language
- Any language is possible. Start with English.
- Keep all UI strings in one place, so a deck can switch language later.

### Delivery
- Runs locally in the browser (dev server and static build).
- Preferred output: a link. Build to a static folder I can host.
- Offline: bundle all fonts and libraries. No CDN calls at runtime.
- Single-file mode: a build option that produces one HTML file that opens by double-click. Note: ES modules do not load over `file://`, so this build must inline all scripts and styles. Videos stay as links and are not inlined.
- Optional PDF export: a Playwright script that takes one screenshot per step and merges them into a PDF.
- No audio in v1. Do not block adding narration (text-to-speech) later.

## 3. Deck format: Markdown storyboard

One Markdown file per deck is the source of truth. Use plain, standard Markdown only. Do not invent a special grammar, custom directives or attribute syntax.

Conventions:

- Frontmatter holds the deck settings: title, language, theme, intensity, confidential.
- Frontmatter can group sections onto a shared canvas, for example `shared-canvas: [value-stream, clarification]`. Sections not listed get their own canvas.
- `#` heading = section. `##` heading = scene. The scene id in the URL is the slug of the heading.
- List items = steps, in order.
- Blockquote = speaker notes for the scene or the step above it.
- `###` heading that ends with `?` = shout-out question. The paragraph after it is the answer.
- `![alt](media/x.png)` = image or GIF.
- `[title](link)` to a YouTube URL, another video URL, or a local video file = video.
- `[title](data/x.csv)` = chart from that data file. The link title describes the chart.

Everything else (camera moves, layout, chart type, effect timing) is not written in the Markdown:

- The engine uses sensible defaults from the theme.
- When a scene needs special choreography, put it in `visuals/<scene-id>.ts`. The Markdown stays clean.

A deck must stay readable as plain Markdown, so it also works as a script for rehearsing.

Suggested folder layout per deck:

```
decks/<deck-id>/
  deck.md
  data/        # CSV / JSON for charts
  visuals/     # custom SVG or TS scene modules
  media/       # images, GIFs, local video files
  sources/     # original material: PDF, PPTX, XLSX, links
```

## 4. Reference scenes

These scenes show the level of storytelling the engine must support. Use them as the demo deck.

### Example A: "The old world breaks"

```markdown
# Opening

## The old way

- Classic title slide: "Engineering Excellence 2026", logo, subtitle.
- Cracks run across the slide.
- The slide breaks into pieces and falls away.
- Black screen. Hold for a moment.

> Let it sit in silence for two seconds.

## Boot

- An 80s computer screen powers on: scanlines, glow, blinking cursor.
- Boot text types itself, line by line.
- The last lines point to the new world: "Loading: AI agents", "Loading: knowledge graph", "Loading: new ways of working".
- Prompt: "READY."

> This is where the story starts.
```

Capabilities this needs:
- Transition effects between scenes: crack, shatter into fragments with gravity, blackout, CRT power-on.
- A retro terminal look: typing text, scanlines, flicker, cursor. Monospace font is allowed here, because the retro screen is content, not a label.

### Example B: "Engineering value stream"

```markdown
# Value stream

## Overview

- The value stream draws itself from left to right: Requirements, Analysis, Clarification, Design, Verification.
- The camera pulls back to show the whole stream.

> This is how work flows today. Now let's walk through it.

## Analysis

- The camera flies to the Analysis stage.
- Thousands of documents stream in.
- An AI agent scans them. Key facts light up and move into structured cards.
- The cards stack up next to the stage.

> What took weeks now takes hours.

## Clarification

- The camera follows the stream to Clarification.
- A person picks up the stack of open questions and walks to the customer.
- Questions and answers appear as speech bubbles.
- The stack of questions shrinks to zero.
- The person walks back. The stream moves on.

### What is still left for humans to do?

The conversations that build trust.
```

Capabilities this needs:
- A path through the world. The camera follows it stage by stage.
- Simple, original character figures that walk along a path (GSAP MotionPathPlugin).
- Swarms of many small objects ("thousands of documents"). SVG gets slow with thousands of nodes, so draw swarms on a Canvas layer inside the world.
- Objects that move from one place to another and change form (document → highlighted fact → card).
- Speech bubbles and counters (a stack that shrinks).

### Example C: "One team, many sites"

```markdown
# Global team

## Where we are

- A world map draws itself.
- Site markers appear one by one: [Site 1], [Site 2], [Site 3], [Site 4].
- At each site, team member figures appear with their role.

> We are spread across the world, but we work as one team.

## Coming together

- Flight arcs draw from every site to [Host site].
- The figures travel along the arcs.
- The camera zooms into [Host site] as they arrive.
- The figures gather around a table.

## Working on the topic

- The topic appears in the middle of the table.
- Each figure adds a sticky note with an idea.
- The notes cluster into three themes.

### What can we only do together?

Decide.
```

Site names are placeholders. I fill them in per deck.

Capabilities this needs:
- A world map from bundled, offline map data with a permissive license (for example Natural Earth via the `world-atlas` package). D3 for the projection.
- Site markers placed by coordinates.
- Animated arcs between sites, and figures moving along them.
- Camera zoom from world level down to one site.
- A clean handover from the map canvas to a "meeting room" canvas, or one shared canvas if the deck says so.

## 5. Authoring workflows (Claude Code skills)

Create these as project skills or slash commands:

1. **Convert deck:** read an old presentation or source (PDF, PPTX, CSV, Excel, website). Extract the story, numbers and visuals. Produce a draft `deck.md`, chart data files, and a list of open questions. Keep a link from every number to its source.
2. **Storyboard:** interview me about a new deck. Produce scenes with purpose, camera idea, steps and notes. No code yet.
3. **Build scene:** turn one storyboard scene into a working scene: layout in the world, camera move, step animations, visual modules.
4. **Review deck:** run the deck in a headless browser, step through every scene, take screenshots, and report layout problems, missing data and broken links.

## 6. Image generation (later, pluggable)

- Define an image-provider interface. Do not implement a provider in v1.
- Microsoft 365 Copilot has no API for image generation, so do not plan on it. Candidate providers later: Azure OpenAI in our tenant, or the OpenAI API.
- API keys come from environment variables only. Never commit keys.
- Each deck has a `confidential: true|false` flag. Confidential decks must never send content to an external image API.

## 7. Architecture

- Vite + TypeScript. GSAP for animation. D3 (scales, shapes, axes only). A Markdown parser (remark or markdown-it).
- Modules: parser, world, camera, timeline/stepper, router, speaker view, overview, section selector, charts, shout-out, media, themes, export.
- Content and effects must not depend on internals of one module. The renderer and the deck format can change independently.
- If the earlier POC (speaker view, overview) exists in this repo, reuse it. Read it first and say what you keep.
- Respect `prefers-reduced-motion`: offer a reduced-motion mode that replaces camera flights with cuts.

## 8. Milestones

1. **Engine core:** parser, canvases, camera, stepper, deep links, section selector, speaker view, overview. Demo: Example B (value stream) with camera flights along the path, on its own canvas, plus one more section on a second canvas.
2. **Effects:** build-up drawing, characters on paths, Canvas swarms, scene transitions, world map, charts from CSV, shout-out questions, video and GIF. Demo: Examples A, B and C.
3. **Themes and delivery:** two themes, static build, single-file build, PDF export.
4. **Workflows:** convert-deck, storyboard, build-scene and review-deck skills.
5. **First real test:** convert one of my existing decks end to end. I choose the deck.

## 9. Acceptance criteria for milestone 1

- I open `#/value-stream/clarification/2` and land on exactly that step.
- Arrow keys and clicks step forward and back. Camera moves are smooth at 60 fps on a normal laptop.
- Speaker view stays in sync when I step in either window.
- Overview shows all canvases and scenes. Clicking one goes there.
- Stepping from one canvas to the next plays a transition. Stepping back works too.
- Two sections on a shared canvas connect with a camera flight, not a transition.
- Section selector lists all sections and jumps correctly.
- Auto-play runs the demo deck to the end and stops on manual input.

## 10. Working rules

- Ask me before choosing a library outside the list above.
- Keep a short `DECISIONS.md` with every architecture decision and its reason.
- Do not invent facts, numbers or quotes in deck content. Mark gaps clearly.
