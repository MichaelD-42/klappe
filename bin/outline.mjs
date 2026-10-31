import fs from 'node:fs'
import path from 'node:path'
import { runnerImport } from 'vite'

// The deck as text: sections, scenes, every step and its note, with ids for the deep links and a timing
// estimate. For reading the story without a browser, and for the content review.
// The pace and the per-step estimate are src/plan.ts, which the speaker view's rehearsal shares.
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
// cut: the deck.md cut to read, as ?cut= plays it; the appendix sections go last either way.
async function readDeck(klappeDir, deckDir, cut = null) {
  const load = async (p) => (await runnerImport(path.join(klappeDir, p), { configFile: false, logLevel: 'error' })).module
  const [{ assembleDeck }, { cutDeck }, { parseFrontmatter }, plan, { LANGS }] = await Promise.all([load('src/deck/assemble.ts'), load('src/layout.ts'), load('src/parse/frontmatter.ts'), load('src/plan.ts'), load('src/fx/code.ts')])
  const files = markdown(deckDir)
  const whole = assembleDeck(files, {})
  const { deck, problems } = cutDeck(whole.deck, cut)
  return { deck, problems: [...whole.problems, ...problems], files, parseFrontmatter, plan, LANGS }
}

// deck.md max-words: one line per step whose on-screen text has more words, or the problem with the key. No key, no lines.
export async function overWords(klappeDir, deckDir) {
  const { deck, files, parseFrontmatter, plan: { words } } = await readDeck(klappeDir, deckDir)
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
// story: only the story view, one line per scene. cut: a deck.md cut. The estimate and the step count leave the
// appendix out: it is not part of the talk.
export async function outline(klappeDir, deckDir, { story = false, cut = null } = {}) {
  const { deck, problems, files, parseFrontmatter, plan: { noteSeconds, sceneSeconds }, LANGS } = await readDeck(klappeDir, deckDir, cut)
  const raw = parseFrontmatter(files['deck.md'] ?? '').data.duration
  if (raw !== undefined && !(typeof raw === 'number' && raw > 0)) problems.push('deck.md: duration needs a number of minutes, for example 45')
  const target = deck.meta.duration // a cut's own duration, else the deck's

  if (story) {
    const lines = deck.sections.flatMap((s) => s.scenes.map((c) => `#/${s.id}/${c.id}: ${c.story ?? '(no story point)'}`))
    return { deck, text: lines.join('\n') + '\n', problems }
  }

  const body = []
  let total = 0
  let count = 0
  for (const s of deck.sections) {
    const lines = []
    let secs = noteSeconds(s.notes)
    let n = 0
    for (const c of s.scenes) {
      lines.push('', `### ${s.id}/${c.id}: ${c.title} (${c.steps.length} ${c.steps.length === 1 ? 'step' : 'steps'})`, ...(c.story ? [`Story: ${c.story}`] : []), ...quote(c.notes, ''))
      secs += sceneSeconds(c)
      // A code step of a fence klappe does not highlight is likely a deck component's: name the fence.
      const own = c.fence && c.fence.lang && !LANGS.includes(c.fence.lang) ? c.fence.lang : undefined
      c.steps.forEach((st, i) => {
        const kind = st.kind === 'step' ? '' : `[${st.kind}] `
        const part = st.part?.kind === 'code' && own ? own : st.part?.kind
        lines.push(`${i + 1}. ${kind}${st.text || `(${part ?? 'no text'})`}`, ...quote(st.notes, '   '))
      })
      n += c.steps.length
    }
    body.push('', `## ${s.id}: ${s.title} (${s.appendix ? 'appendix, ' : ''}${n} steps, ${minutes(secs)})`, ...quote(s.notes, ''), ...lines)
    if (s.appendix) continue
    total += secs
    count += n
  }
  const over = typeof target === 'number' && target > 0 ? Math.round(total / 60 - target) : undefined
  const vs = over === undefined ? '' : `; target ${target} min, ${over > 0 ? `${over} min over` : over < 0 ? `${-over} min under` : 'on target'}`
  return { deck, text: [`# ${deck.meta.title}${cut === null ? '' : `, cut ${cut}`} (${count} steps, ${minutes(total)}${vs})`, ...body, ''].join('\n'), problems }
}
