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

// Returns the outline as Markdown and the deck problems the parser found.
export async function outline(klappeDir, deckDir) {
  const load = async (p) => (await runnerImport(path.join(klappeDir, p), { configFile: false, logLevel: 'error' })).module
  const [{ assembleDeck }, { parseFrontmatter }] = await Promise.all([load('src/deck/assemble.ts'), load('src/parse/frontmatter.ts')])
  const files = markdown(deckDir)
  // Without the scene.ts modules: the steps come from scene.md, and the step count check is the self-test's.
  const { deck, problems } = assembleDeck(files, {})
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
  return { text: [`# ${deck.meta.title} (${count} steps, ${minutes(total)}${vs})`, ...body, ''].join('\n'), problems }
}
