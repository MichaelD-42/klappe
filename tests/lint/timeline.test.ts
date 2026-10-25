import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

// The timeline rule, checked in the code before the walk has to find it: seek must equal play.
// from() renders its start value at once, and a seek back lands on that, not on the state before the step: use fromTo().
// Not checked: a fromTo() without immediateRender: false. It is right when its start value is the load state (the
// default then writes it at load, as a seek back would), and only the walk can tell that from a start that shows early.
type Rule = 'from'

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

export function lintTimeline(file: string, raw: string): { rule: Rule; at: string }[] {
  const text = stripComments(raw)
  const hits: { rule: Rule; at: string }[] = []
  const line = (i: number) => `${file}:${text.slice(0, i).split('\n').length}`
  // Array.from and friends are not tweens.
  for (const m of text.matchAll(/([\w$]*)\.from\(/g)) if (!/^(?:Array|Object|Buffer|Uint\w*|Int\w*|Float\w*)$/.test(m[1])) hits.push({ rule: 'from', at: line(m.index) })
  return hits
}

describe('timeline lint catches each rule', () => {
  test.each(['tl.from(box, { autoAlpha: 0 })', 'gsap.from(box, { x: -40 })', 'tl.to(a, { x: 1 }).from(b, { y: 0 })'])('%s', (text) => {
    expect(lintTimeline('decks/d/scene.ts', text).map((h) => h.rule)).toEqual(['from'])
  })

  test('legitimate code passes', () => {
    const ok = [
      'tl.fromTo(box, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, immediateRender: false })',
      'const xs = Array.from({ length: 3 }, (_, i) => i)',
      'const b = Buffer.from(text)',
      '// tl.from(box, { x: 0 })',
      '/* gsap.from(box) */',
    ]
    for (const text of ok) expect(lintTimeline('decks/d/scene.ts', text), text).toEqual([])
  })

  test('a hit names its line', () => {
    expect(lintTimeline('decks/d/scene.ts', 'const a = 1\n\ntl.from(box, {})')).toEqual([{ rule: 'from', at: 'decks/d/scene.ts:3' }])
  })
})

describe('timeline lint over the repo', () => {
  // The decks of the repo that runs the tests (a deck repo or klappe itself).
  const scan = (root: string, dir: string) => {
    const abs = path.join(root, dir)
    if (!fs.existsSync(abs)) return []
    return (fs.readdirSync(abs, { recursive: true }) as string[])
      .filter((f) => f.endsWith('.ts'))
      .map((f) => ({ file: `${dir}/${f.replaceAll('\\', '/')}`, abs: path.join(abs, f) }))
  }
  const files = scan(process.cwd(), 'decks')

  test('finds the files to check', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  test('no tween in deck code uses from()', () => {
    const hits = files.flatMap(({ file, abs }) => lintTimeline(file, fs.readFileSync(abs, 'utf8').replaceAll('\r\n', '\n')))
    expect(hits.map((h) => `${h.rule}: ${h.at}`)).toEqual([])
  })
})
