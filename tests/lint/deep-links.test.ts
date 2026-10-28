import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import { assembleDeck } from '../../src/deck/assemble'

// Every demo deep link the acceptance checks (src/selftest.ts, its DEMO list), the author docs, the skill and the
// agents name must still reach its section, scene and step: moving a story scene then fails here, not in a search.
const root = fileURLToPath(new URL('../../', import.meta.url))
const demo = path.join(root, 'decks/demo')
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
const rel = (f: string) => path.relative(root, f).replaceAll('\\', '/')

const files = Object.fromEntries(
  walk(demo)
    .map((f) => path.relative(demo, f).replaceAll('\\', '/'))
    .filter((f) => f === 'deck.md' || /^sections\/.*\/(?:section|scene)\.md$/.test(f))
    .map((f) => [f, fs.readFileSync(path.join(demo, f), 'utf8')]),
)
const { deck } = assembleDeck(files, {})

const reaches = (section: string, scene?: string, step?: string) => {
  const s = deck.sections.find((x) => x.id === section)
  const c = scene === undefined ? undefined : s?.scenes.find((x) => x.id === scene)
  return !!s && (scene === undefined || (!!c && (step === undefined || +step <= c.steps.length)))
}

const named = [
  ...['docs/reference', '.claude', 'decks/demo/shared'].flatMap((d) => walk(path.join(root, d))),
  ...['README.md', 'docs/glossary.md', 'docs/architecture.md', 'src/selftest.ts'].map((f) => path.join(root, f)),
].filter((f) => /\.(?:md|ts)$/.test(f))

test('every demo deep link named in the checks and docs reaches its step', () => {
  const gone: string[] = []
  for (const f of named)
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/#\/([^/\s`)"'\]]+)(?:\/([^/\s`)"'\]]+))?(?:\/(\d+))?/g)) {
      if (/^[<$]|^section$/.test(m[1])) continue // a placeholder: #/<section>/<scene>, #/section/scene, #/${…}
      if (!reaches(m[1], m[2], m[3])) gone.push(`${rel(f)}: ${m[0]}`)
    }
  expect(gone).toEqual([])
})

test('the selftest names the demo steps it stands on in one list', () => {
  const src = fs.readFileSync(path.join(root, 'src/selftest.ts'), 'utf8')
  // stepOf("section", "scene", n) or a scene id in a string bypasses the DEMO list and the check above.
  expect(src.match(/(?:stepOf|lastOf)\("|(?:section|scene|id) [!=]== "|data-scene="[a-z]/g) ?? []).toEqual([])
})
