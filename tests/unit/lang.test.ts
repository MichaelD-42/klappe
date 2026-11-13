import { expect, test } from 'vitest'
import { assembleDeck } from '../../src/deck/assemble'
import { langTexts, parseLang, writeLang } from '../../src/deck/lang'

const deck: Record<string, string> = {
  'deck.md': '---\ntitle: The talk\nlang: en\n---\n',
  'sections/10-intro/section.md': '# Intro\n\n> Section note.\n',
  'sections/10-intro/10-hello/scene.md':
    '## Hello\n\n> Scene note.\n\n- Welcome.\n  > Say hi.\n- ![A cat](media/cat.png)\n\n| | Old | New |\n| --- | --- | --- |\n| Speed | slow | fast |\n',
  'sections/10-intro/20-ask/scene.md': '## Ask\n\n### Why?\n\nBecause.\n\n- 09:00 – 09:30 Coffee\n',
}
const de = `# de

## deck

> The talk

Der Vortrag

## intro

> Intro

Einstieg

> Section note.

Abschnittsnotiz.

## intro/hello

> Hello

Hallo

> Scene note.

Szenennotiz.

> Welcome.

Willkommen.

> Say hi.

Sag hallo.

> A cat

Eine Katze

> Old

Alt

> Speed

Tempo

> slow

langsam
`

test('without a lang the deck is as before, and lists its languages, the source first', () => {
  const plain = assembleDeck(deck, {})
  const both = assembleDeck({ ...deck, 'lang/de.md': de }, {})
  expect(both.deck.sections).toEqual(plain.deck.sections)
  expect(both.deck.meta).toMatchObject({ lang: 'en', source: 'en', languages: ['en', 'de'] })
  expect(both.problems).toEqual([])
})

test('a lang translates the deck and section titles, scene text, notes, alt text and table cells', () => {
  const r = assembleDeck({ ...deck, 'lang/de.md': de }, {}, 'de')
  expect(r.problems).toEqual([])
  expect(r.deck.meta).toMatchObject({ title: 'Der Vortrag', lang: 'de', source: 'en' })
  const [s] = r.deck.sections
  expect([s.title, s.notes]).toEqual(['Einstieg', 'Abschnittsnotiz.'])
  const hello = s.scenes[0]
  expect([hello.title, hello.notes]).toEqual(['Hallo', 'Szenennotiz.'])
  expect(hello.steps.map((x) => x.text)).toEqual(['Willkommen.', 'Eine Katze', 'Tempo'])
  expect(hello.steps[0].notes).toBe('Sag hallo.')
  expect(hello.steps[1].media?.alt).toBe('Eine Katze')
  expect(hello.table).toEqual({ columns: ['Alt', 'New'], rows: [{ label: 'Tempo', cells: ['langsam', 'fast'] }] })
})

test('a text with no translation shows the source and is a warning naming its scene', () => {
  const r = assembleDeck({ ...deck, 'lang/de.md': de }, {}, 'de')
  const ask = r.deck.sections[0].scenes[1]
  expect(ask.steps.map((x) => x.text)).toEqual(['Why?', 'Because.', 'Coffee'])
  expect(r.deck.langWarnings).toContain('#/intro/ask: no de translation for "Ask"')
  expect(r.deck.langWarnings).toContain('#/intro/hello: no de translation for "New"')
  expect(r.deck.langWarnings).toContain('#/intro/ask: no de translation for "Coffee"')
})

test('a stale translation is used and warned about; an empty one is missing', () => {
  const md = '## intro/hello\n\n> Hello\n\n<!-- was: Hi -->\n\nHallo\n\n> Welcome.\n'
  const r = assembleDeck({ ...deck, 'lang/de.md': md }, {}, 'de')
  const hello = r.deck.sections[0].scenes[0]
  expect(hello.title).toBe('Hallo')
  expect(hello.steps[0].text).toBe('Welcome.')
  expect(r.deck.langWarnings).toContain('#/intro/hello: stale de translation for "Hello" (it was written for "Hi")')
  expect(r.deck.langWarnings).toContain('#/intro/hello: no de translation for "Welcome."')
})

test('the source language, an unknown lang and a heading that names nothing are deck problems', () => {
  expect(assembleDeck({ ...deck, 'lang/en.md': de }, {}).problems).toEqual(['lang/en.md: en is the source language (deck.md lang); its text is the deck itself'])
  const r = assembleDeck(deck, {}, 'fr')
  expect(r.problems).toEqual(["lang 'fr': the deck has no lang/fr.md"])
  expect(r.deck.meta.lang).toBe('en')
  expect(assembleDeck({ ...deck, 'lang/de.md': '## intro/gone\n\n> X\n\nY\n' }, {}, 'de').problems).toEqual(["lang/de.md: '## intro/gone' names no section or scene"])
})

test('translate looks a text up in the scene, then its section, then the deck; keys ignore runs of whitespace', () => {
  const md = '## deck\n\n> Shared\n\nGemeinsam\n\n## intro\n\n> Section word\n\nAbschnittswort\n\n## intro/hello\n\n> Own   line\n\nEigene Zeile\n'
  const d = assembleDeck({ ...deck, 'lang/de.md': md }, {}, 'de').deck
  const t = d.translate!
  expect(t(['intro/hello', 'intro', 'deck'], 'Own line')).toBe('Eigene Zeile')
  expect(t(['intro/hello', 'intro', 'deck'], 'Section word')).toBe('Abschnittswort')
  expect(t(['intro/hello', 'intro', 'deck'], 'Shared')).toBe('Gemeinsam')
  expect(t(['intro/hello', 'intro', 'deck'], 'Nope')).toBe('Nope')
  expect(d.langWarnings).toContain('#/intro/hello: no de translation for "Nope"')
})

test('a note over several paragraphs round-trips through writeLang and parseLang', () => {
  const texts: [string, string][] = [['intro/hello', 'First para.\n\nSecond para.']]
  const md = writeLang('de', '', texts).replace('> Second para.\n', '> Second para.\n\nErster.\n\nZweiter.\n')
  const e = parseLang(md).get('intro/hello')!.get('First para. Second para.')!
  expect(e).toEqual({ source: 'First para.\n\nSecond para.', text: 'Erster.\n\nZweiter.' })
})

test('writeLang keeps filled translations, marks a changed source stale, drops gone ones, and is stable', () => {
  const texts = langTexts(assembleDeck(deck, {}).deck)
  expect(texts).toContainEqual(['deck', 'The talk'])
  expect(texts).toContainEqual(['intro/ask', 'Coffee'])
  expect(texts.filter(([, x]) => x === 'Speed')).toHaveLength(1) // a step text and its table row label are one entry
  const first = writeLang('de', de, texts)
  expect(writeLang('de', first, texts)).toBe(first)
  expect(first).toContain('> Hello\n\nHallo\n')
  expect(first).toContain('> Coffee\n')
  const changed = texts.map(([s, x]): [string, string] => [s, x === 'Hello' ? 'Hello there' : x]).filter(([, x]) => x !== 'Old')
  const next = writeLang('de', first, changed)
  expect(next).toContain('> Hello there\n\n<!-- was: Hello -->\n\nHallo\n')
  expect(next).not.toContain('> Old')
})
