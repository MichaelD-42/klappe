import fs from 'node:fs'
import path from 'node:path'
import { runnerImport } from 'vite'
import { markdown } from './outline.mjs'

// ctx.t("…") with a string literal: what `klappe lang` adds to a scope besides the scene.md texts. A template
// literal with ${…} is not one text, so it is skipped.
const CALL = /\bt\(\s*(["'`])((?:\\[\s\S]|(?!\1)[^\\])*)\1\s*\)/g
const ESC = { n: '\n', t: '\t' }
export function tLiterals(src) {
  return [...src.matchAll(CALL)].filter((m) => !(m[1] === '`' && m[2].includes('${'))).map((m) => m[2].replace(/\\([\s\S])/g, (_, c) => ESC[c] ?? c))
}

// The scope of a .ts file in the deck: a scene.ts its scene, other code in a section folder its section, the rest the deck.
function scopeOf(rel, idFromFolder) {
  const [top, s, c, file] = rel.split('/')
  if (top !== 'sections' || !c) return 'deck'
  if (s.startsWith('_') || c.startsWith('_')) return null // parked, out of the deck
  const sec = idFromFolder(s).id
  return file === 'scene.ts' ? `${sec}/${idFromFolder(c).id}` : sec
}

// Writes decks/<id>/lang/<code>.md and returns its counts. Texts come in deck order, a scope's ctx.t strings after
// its scene.md texts.
export async function writeLangFile(klappeDir, deckDir, code) {
  const load = async (p) => (await runnerImport(path.join(klappeDir, p), { configFile: false, logLevel: 'error' })).module
  const [{ assembleDeck }, { langTexts, writeLang, parseLang, key }, { idFromFolder }] = await Promise.all([load('src/deck/assemble.ts'), load('src/deck/lang.ts'), load('src/parse/ids.ts')])
  const files = markdown(deckDir)
  const source = Object.fromEntries(Object.entries(files).filter(([k]) => !k.startsWith('lang/')))
  const { deck } = assembleDeck(source, {})
  if (code === deck.meta.lang) throw new Error(`${code} is the source language (deck.md lang): its text is the deck itself`)
  const byScope = new Map()
  for (const [scope, text] of langTexts(deck)) byScope.set(scope, [...(byScope.get(scope) ?? []), text])
  const ts = fs.readdirSync(deckDir, { recursive: true }).map((f) => f.replaceAll('\\', '/')).filter((f) => f.endsWith('.ts') && !f.includes('node_modules/')).sort()
  for (const rel of ts) {
    const scope = scopeOf(rel, idFromFolder)
    if (scope === null) continue
    const list = byScope.get(scope) ?? []
    for (const t of tLiterals(fs.readFileSync(path.join(deckDir, rel), 'utf8'))) if (!list.some((x) => key(x) === key(t))) list.push(t)
    byScope.set(scope, list)
  }
  const texts = [...byScope].flatMap(([scope, list]) => list.map((t) => [scope, t]))
  const file = path.join(deckDir, 'lang', `${code}.md`)
  const md = writeLang(code, fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '', texts)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, md)
  const entries = [...parseLang(md).values()].flatMap((m) => [...m.values()])
  return { file, texts: entries.length, open: entries.filter((e) => !e.text).length, stale: entries.filter((e) => e.was !== undefined).length }
}
