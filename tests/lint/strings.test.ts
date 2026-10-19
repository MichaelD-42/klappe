import fs from 'node:fs'
import { expect, test } from 'vitest'
import { strings } from '../../src/strings'

// Effect UI words live in src/strings.ts; src/fx and the media slot use t(key, lang), not the literal.
const KEYS = ['dataMissing', 'dataError', 'imageMissing', 'videoMissing', 'effectMissing', 'needsInternet', 'sampleData', 'net', 'total', 'increase', 'decrease'] as const

test('effect UI words come from strings.ts, not literals in the code', () => {
  const dir = new URL('../../src/fx/', import.meta.url)
  const files = [...fs.readdirSync(dir).filter((f) => f.endsWith('.ts')).map((f) => new URL(f, dir)), new URL('../../src/render/world.ts', import.meta.url)]
  const code = files.map((f) => fs.readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '')).join('\n')
  for (const k of KEYS) {
    const word = strings.en[k]
    expect(word, k).toBeTruthy()
    // As a whole quoted literal, or leading a template literal ("net ${...}", "EFFECT MISSING: ${...}");
    // not as a t() key ("net" is both).
    expect(code, k).not.toMatch(new RegExp(`(?<!t\\()["'\`]${word}(["'\`]|[ :]+\$\{)`))
  }
})
