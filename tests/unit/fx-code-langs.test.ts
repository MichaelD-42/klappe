import { expect, test } from 'vitest'
import { codeLines, LANGS, loadHighlighter } from '../../src/fx/code'

// Its own file: loadHighlighter runs once per module, and fx-code.test.ts loads only ts.
// Each key must name the grammar it loads (or an alias), or Shiki throws or shows it plain.
const SAMPLE: Record<string, string> = { html: '<b>a</b>', xml: '<b>a</b>', markdown: '# a\n`b`', diff: '+ a\n- b\n c', toml: 'a = "b"', dockerfile: 'FROM node', yaml: 'a: "b"' }
test('every bundled language highlights', async () => {
  await loadHighlighter(LANGS)
  const colours = (l: string) => new Set(codeLines(SAMPLE[l] ?? 'if (x) { return "a" } // b', l).flat().map((t) => t.color)).size
  expect(LANGS.filter((l) => colours(l) < 2)).toEqual([])
  expect(LANGS).toEqual(expect.arrayContaining(['go', 'rust', 'java', 'kotlin', 'csharp', 'c', 'cpp', 'ruby', 'php', 'swift', 'dockerfile', 'toml', 'xml', 'markdown', 'diff', 'hcl']))
})
