import { describe, expect, test } from 'vitest'
import { typed } from '../../src/fx/crt'

describe('crt typing', () => {
  const full = 'DRIVES A: B: C: ... OK'

  test.each([0, 0.1, 0.33, 0.5, 0.77, 0.99, 1])('at p=%s the text is the first round(p * len) characters', (p) => {
    expect(typed(full, p)).toBe(full.slice(0, Math.round(p * full.length)))
  })

  test('an odd length and an empty line', () => {
    expect(typed('abc', 0.5)).toBe('ab')
    expect(typed('', 0.5)).toBe('')
  })

  test('a memory line types its label, then counts up in 16K steps, then shows OK', () => {
    const mem = 'MEMORY TEST: 640K OK'
    expect(typed(mem, 0)).toBe('')
    const counting = typed(mem, 0.7)
    expect(counting).toMatch(/^MEMORY TEST: +\d+K$/)
    expect(Number(counting.match(/(\d+)K/)![1]) % 16).toBe(0)
    expect(typed(mem, 1)).toBe(mem)
  })
})
