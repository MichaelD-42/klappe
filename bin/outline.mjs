import fs from 'node:fs'
import path from 'node:path'
import { runnerImport } from 'vite'

// The deck as text: sections, scenes, every step and its note, with ids for the deep links and a timing
// estimate. For reading the story without a browser, and for the content review.
const WPM = 130 // speaking pace for the notes
const MIN_STEP_S = 15 // a step without a note still takes a moment to show and say

const words = (s) => (s.match(/\S+/g) ?? []).length
// shortcut: notes at a fixed pace, every step at least MIN_STEP_S; exercises and timers are not counted. Upgrade
// when a deck needs per-scene durations.
export const stepSeconds = (notes) => Math.max(MIN_STEP_S, (words(notes) / WPM) * 60)
const minutes = (s) => `about ${Math.max(1, Math.round(s / 60))} min`

// The deck's Markdown files, keyed as the browser keys them: "deck.md", "sections/<section>/<scene>/scene.md".
function markdown(deckDir) {
  return Object.fromEntries(
    fs.readdirSync(deckDir, { recursive: true })
      .map((f) => f.replaceAll('\\', '/'))
      .filter((f) => f === 'deck.md' || (f.startsWith('sections/') && /\/(?:section|scene)\.md$/.test(f)))
      .map((f) => [f, fs.readFileSync(path.join(deckDir, f), 'utf8')]),
  )
}

const quote = (notes, pad) => notes.split('\n').filter((l) => l.trim()).map((l) => `${pad}> ${l}`)

// The deck from its Markdown alone: the steps come from scene.md, and the step count check is the self-test's.
async function readDeck(klappeDir, deckDir) {
  const load = async (p) => (await runnerImport(path.join(klappeDir, p), { configFile: false, logLevel: 'error' })).module
  const [{ assembleDeck }, { parseFrontmatter }] = await Promise.all([load('src/deck/assemble.ts'), load('src/parse/frontmatter.ts')])
  const files = markdown(deckDir)
  return { ...assembleDeck(files, {}), files, parseFrontmatter }
}

// deck.md max-words: one line per step whose on-screen text has more words, or the problem with the key. No key, no lines.
export async function overWords(klappeDir, deckDir) {
  const { deck, files, parseFrontmatter } = await readDeck(klappeDir, deckDir)
  const n = parseFrontmatter(files['deck.md'] ?? '').data['max-words']
  if (n === undefined) return []
  if (!(Number.isInteger(n) && n > 0)) return ['deck.md: max-words needs a whole number of words, for example 12']
  return deck.sections.flatMap((s) =>
    s.scenes.flatMap((c) => c.steps.flatMap((st, i) => (words(st.text) > n ? [`#/${s.id}/${c.id}/${i + 1}: ${words(st.text)} words > ${n}`] : []))),
  )
}

// The scenes `test --only` walks, as <section>/<scene> in deck order, and the targets that name none.
export function walkedScenes(deck, targets) {
  const parts = targets.map((t) => t.replace(/^#?\/?/, '').split('/'))
  const all = deck.sections.flatMap((s) => s.scenes.map((c) => [s.id, c.id]))
  const hit = ([s, c], [section, scene]) => s === section && (!scene || c === scene)
  return {
    scenes: all.filter((sc) => parts.some((p) => hit(sc, p))).map((sc) => sc.join('/')),
    unknown: targets.filter((_, i) => !all.some((sc) => hit(sc, parts[i]))),
  }
}

// Returns the outline as Markdown and the deck problems the parser found.
export async function outline(klappeDir, deckDir) {
  const { deck, problems, files, parseFrontmatter } = await readDeck(klappeDir, deckDir)
  const target = parseFrontmatter(files['deck.md'] ?? '').data.duration
  if (target !== undefined && !(typeof target === 'number' && target > 0)) problems.push('deck.md: duration needs a number of minutes, for example 45')

  const body = []
  let total = 0
  let count = 0
  for (const s of deck.sections) {
    const lines = []
    let secs = (words(s.notes) / WPM) * 60
    let n = 0
    for (const c of s.scenes) {
      lines.push('', `### ${s.id}/${c.id}: ${c.title} (${c.steps.length} ${c.steps.length === 1 ? 'step' : 'steps'})`, ...quote(c.notes, ''))
      secs += (words(c.notes) / WPM) * 60
      c.steps.forEach((st, i) => {
        const kind = st.kind === 'step' ? '' : `[${st.kind}] `
        lines.push(`${i + 1}. ${kind}${st.text || `(${st.part?.kind ?? 'no text'})`}`, ...quote(st.notes, '   '))
        secs += stepSeconds(st.notes)
      })
      n += c.steps.length
    }
    body.push('', `## ${s.id}: ${s.title} (${n} steps, ${minutes(secs)})`, ...quote(s.notes, ''), ...lines)
    total += secs
    count += n
  }
  const over = typeof target === 'number' && target > 0 ? Math.round(total / 60 - target) : undefined
  const vs = over === undefined ? '' : `; target ${target} min, ${over > 0 ? `${over} min over` : over < 0 ? `${-over} min under` : 'on target'}`
  return { deck, text: [`# ${deck.meta.title} (${count} steps, ${minutes(total)}${vs})`, ...body, ''].join('\n'), problems }
}
