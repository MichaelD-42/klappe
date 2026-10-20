import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import * as fx from '../../src/fx'

// Exports not documented yet. Each element task removes its own names when its reference page lands;
// Task 13 removes the M2 effects with the effects page.
const PENDING = [
  // M3 elements
  'callout', 'flow', 'sequence', 'swimlanes',
  'decisionTree', 'checklist', 'agenda', 'timer',
  // M2 effects
  'KEN_BURNS', 'MIN_FONT', 'arcPath', 'bubble', 'chart', 'chartDomain', 'counted', 'counter', 'counterText', 'crt',
  'dataError', 'drawOn', 'figure', 'fitFont', 'fitProjection', 'icon', 'iconGlyph', 'iconTile', 'image', 'limbAngle',
  'lineArt', 'morph', 'parseCsv', 'playTransition', 'registry', 'shatter', 'shatterGeometry', 'shout', 'showsSample',
  'swarm', 'swarmPoint', 'transitionCrt', 'transitionShatter', 'transitionZoom', 'typed', 'video', 'waterfallSteps',
  'worldMap',
]

const root = fileURLToPath(new URL('../../', import.meta.url))
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
const read = (p: string) => fs.readFileSync(p, 'utf8')

test('every klappe/fx export has a heading in docs/reference', () => {
  const headings = walk(path.join(root, 'docs/reference'))
    .filter((f) => f.endsWith('.md'))
    .flatMap((f) => [...read(f).matchAll(/^#+\s+(.+)$/gm)].map((m) => m[1].trim()))
  const has = (name: string) => headings.some((h) => h === name || h.includes(`\`${name}\``))
  const missing = Object.keys(fx).filter((name) => !PENDING.includes(name) && !has(name))
  expect(missing).toEqual([])
  // A documented name leaves PENDING, so the list only shrinks.
  expect(PENDING.filter(has)).toEqual([])
})

// themes.md writes some tokens short: `-string` after `--k-code-token-constant`, `--k-series-1` to `--k-series-6`.
function documentedTokens(md: string): Set<string> {
  const out = new Set<string>()
  for (const line of md.split('\n')) {
    let prefix = ''
    for (const [, tok] of line.matchAll(/`(-[\w-]+)`/g)) {
      if (tok.startsWith('--k-')) {
        out.add(tok)
        prefix = tok.replace(/-[^-]+$/, '')
      } else if (prefix) out.add(prefix + tok)
    }
    const range = /`(--k-[\w-]+?)(\d+)` to `\1(\d+)`/.exec(line)
    if (range) for (let i = +range[2]; i <= +range[3]; i++) out.add(range[1] + i)
  }
  return out
}

test('the short token forms in themes.md expand', () => {
  const t = documentedTokens('| `--k-series-1` to `--k-series-3` | x |\n| `--k-code-token-constant`, `-string-expression` | y |')
  expect([...t].sort()).toEqual(
    ['--k-code-token-constant', '--k-code-token-string-expression', '--k-series-1', '--k-series-2', '--k-series-3'].sort(),
  )
})

test('every --k- token used in src is in themes.md', () => {
  const documented = documentedTokens(read(path.join(root, 'docs/reference/themes.md')))
  const files = walk(path.join(root, 'src')).filter((f) => /\.(ts|css)$/.test(f))
  // A property an effect sets for itself (--k-crt in crt.ts) is not a theme token.
  const local = new Set(
    files.filter((f) => !f.includes(`${path.sep}themes${path.sep}`)).flatMap((f) => [...read(f).matchAll(/(--k-[\w-]+)\s*:/g)].map((m) => m[1])),
  )
  const used = new Set(files.flatMap((f) => read(f).match(/--k-[\w-]+/g) ?? []))
  // A name built at run time (`--k-series-${n}`) shows as its prefix.
  const known = (t: string) => documented.has(t) || local.has(t) || (t.endsWith('-') && [...documented].some((d) => d.startsWith(t)))
  expect([...used].filter((t) => !known(t))).toEqual([])
})
