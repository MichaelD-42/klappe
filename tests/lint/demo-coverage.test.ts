import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import * as fx from '../../src/fx'

// The demo deck shows every effect and element a deck author can call, and every transition kind.
// Not called by deck authors: pure helpers (layout, parsing, maths) and engine-only parts.
const ALLOW = [
  'KEN_BURNS', 'LANGS', 'cleanSvg', 'donutSlices', 'kpiDelta', 'raceRanks', 'spread', 'waffleCells', 'scribble', 'MARKER_MIX', 'scrambleGlyphs', 'MAX_LINES', 'MIN_FONT', 'anchor', 'arcPath', 'chartDomain', 'codeLines', 'counted', 'counterText', 'bubbleLayout', 'wrapBreaks', 'crtColor', 'cursorCentre',
  'dataError', 'edgePath', 'fitFont', 'fitProjection', 'flowRoutes', 'iconGlyph', 'labelPos', 'limbAngle', 'matrixLayout', 'lineDiff', 'loadHighlighter',
  'parseCsv', 'parseGroups', 'roadmapLayout', 'rowY', 'shatterGeometry', 'showsSample', 'splitConsole', 'swarmPoint', 'swimlaneRoutes',
  'timerState', 'treeLayout', 'treeRoute', 'typed', 'untilMs', 'waterfallSteps',
  // The transition functions: covered by the transition kinds below.
  'loadTransitions', 'playTransition', 'registry', 'transitionCrt', 'transitionShatter', 'transitionZoom',
  'funnelLayout', 'sankeyLayout', // funnel-sankey: chart layout helpers
  'gaugeAngle', 'likertShares', // gauge task
  'cycleLayout', 'vModelLayout', // cycle task: the cycle and vModel layouts, for their unit test
  'pyramidLayout', 'vennLayout', // venn-pyramid task
  'NOTE_MIX', 'fanPose', 'stickyLayout', // notes-cards: the note colour mix and the two layouts, for their unit tests
  'cloudLayout', // cloud-quote task: the word cloud layout, for its unit test
  'wordDiff', 'flapGlyphs', // redline-flap task: the word diff and the board glyphs, for their unit test
  'barInk', 'sankeyPalette', 'scatterIn', // fix-w3: funnel value ink, sankey node colours, sticky-note scatter, for their unit tests
  'loupeOffset', // loupe task: the lens offset, for its unit test
  'irisHole', 'irisRadius', 'pushOffset', // push-iris: the transition geometry, for its unit test
  'glitchFrame', 'pagePeel', 'transitionCube', 'transitionGlitch', 'transitionPageTurn', // glitch-cube-page: the transitions (covered by their kinds); the glitch frame and the peel, for their unit test
  'handwriteGlyphs', // handwriting task: the per-glyph write timing, for its unit test
  'magicBox', 'magicFit', 'transitionMagicMove', // magic-move: the transition (covered by its kind); the rect and pose maths, for its unit test
]
// Every seek (a deep link, a step back, a jump from the speaker view) cuts, so no section asks for it.
const SHOWN_BY_ENGINE = ['cut']

// The Markdown forms, and the element each one builds (src/render/world.ts).
const MARKDOWN: Record<string, RegExp> = {
  code: /^```(?!console)\w+ \{[\d,|-]+\}$/m, // a fence with highlight groups
  terminal: /^```console$/m,
  checklist: /^- \[[ x]\] /m,
  agenda: /^- \d\d:\d\d[–-]\d\d:\d\d .+←$/m, // with the current row marked
  image: /!\[[^\]]*\]\(media\//,
  video: /\]\([^)]*\.(?:mp4|webm)\)/,
  chart: /\]\(data\/[^)]*\.csv\)/,
}
const M3_FORMS = ['code', 'terminal', 'checklist', 'agenda']

const demo = fileURLToPath(new URL('../../decks/demo/', import.meta.url))
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
const files = walk(demo)
const read = (pick: (f: string) => boolean) => files.filter(pick).map((f) => fs.readFileSync(f, 'utf8')).join('\n')
const ts = read((f) => f.endsWith('.ts'))
const md = read((f) => path.basename(f) === 'scene.md')

const called = (name: string) => new RegExp(String.raw`(?<![\w.$])${name}\(`).test(ts)

test('the demo calls every klappe/fx effect and element', () => {
  const missing = Object.keys(fx).filter((n) => !ALLOW.includes(n) && !called(n) && !MARKDOWN[n]?.test(md))
  expect(missing).toEqual([])
})

test('the allow-list names only real exports', () => {
  expect(ALLOW.filter((n) => !(n in fx))).toEqual([])
})

test('a section of the demo enters with every transition kind', () => {
  const used = (kind: string) => new RegExp(String.raw`transition:\s*["']${kind}["']`).test(ts)
  expect(Object.keys(fx.registry).filter((k) => !SHOWN_BY_ENGINE.includes(k) && !used(k))).toEqual([])
})

test('the demo uses each Markdown form of the M3 elements', () => {
  expect(M3_FORMS.filter((f) => !MARKDOWN[f].test(md))).toEqual([])
})
