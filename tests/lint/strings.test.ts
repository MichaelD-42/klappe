import fs from 'node:fs'
import { expect, test } from 'vitest'
import { strings, t } from '../../src/strings'

// Effect UI words live in src/strings.ts; src/fx and the media slot use t(key, lang), not the literal.
const KEYS = [
  'dataMissing', 'dataError', 'imageMissing', 'videoMissing', 'effectMissing', 'video', 'needsInternet',
  'sampleData', 'source', 'originNotStated', 'net', 'total', 'increase', 'decrease',
] as const

const literal = (word: string) =>
  // A whole quoted literal, or one that leads a template ("net ${...}", "Source: ${...}"); not a t() key ("net" is both).
  new RegExp(String.raw`(?<!t\()["'` + '`' + String.raw`]${word}(["'` + '`' + String.raw`]|[ :]+\$\{)`)

test('the literal check catches both forms and skips t() keys', () => {
  expect('x = "Total"').toMatch(literal('Total'))
  expect('x = `net ${fmt(n)}`').toMatch(literal('net'))
  expect('x = `Source: ${src}`').toMatch(literal('Source'))
  expect('x = t("net", LANG)').not.toMatch(literal('net'))
})

test('effect UI words come from strings.ts, not literals in the code', () => {
  const dir = new URL('../../src/fx/', import.meta.url)
  const files = [...fs.readdirSync(dir).filter((f) => f.endsWith('.ts')).map((f) => new URL(f, dir)), new URL('../../src/render/world.ts', import.meta.url)]
  const code = files.map((f) => fs.readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '')).join('\n')
  for (const k of KEYS) {
    expect(strings.en[k], k).toBeTruthy()
    expect(code, k).not.toMatch(literal(strings.en[k]))
  }
})

test('t() falls back to en for an unknown language or a key missing in it', () => {
  expect(t('total', 'xx')).toBe('Total')
  const de = { ...strings.en } as Record<string, string>
  delete de.total
  ;(strings as Record<string, unknown>).de = de
  try {
    expect(t('total', 'de')).toBe('Total')
  } finally {
    delete (strings as Record<string, unknown>).de
  }
})
