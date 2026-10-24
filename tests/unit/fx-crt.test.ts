import { describe, expect, test } from 'vitest'
import { counted, crtColor, cursorCentre, fitFont, MIN_FONT, typed } from '../../src/fx/crt'

describe('crt typing', () => {
  const full = 'DRIVES A: B: C: ... OK'

  test.each([0, 0.1, 0.33, 0.5, 0.77, 0.99, 1])('at p=%s the text is the first round(p * len) characters', (p) => {
    expect(typed(full, p)).toBe(full.slice(0, Math.round(p * full.length)))
  })

  test('an odd length, an empty line, and a plain line that looks like a count line', () => {
    expect(typed('abc', 0.5)).toBe('ab')
    expect(typed('', 0.5)).toBe('')
    const mem = 'MEMORY TEST: 640K OK'
    expect(typed(mem, 0.5)).toBe(mem.slice(0, 10))
  })

  test('a count line types its label, then counts up in 16K steps, then shows OK', () => {
    const mem = 'MEMORY TEST: 640K OK'
    expect(counted(mem, 0)).toBe('')
    const counting = counted(mem, 0.7)
    expect(counting).toMatch(/^MEMORY TEST: +\d+K$/)
    expect(Number(counting.match(/(\d+)K/)![1]) % 16).toBe(0)
    expect(counted(mem, 1)).toBe(mem)
  })
})

describe('crt font fit', () => {
  // The terminal box of a full 1920x1080 scene.
  const [w, h] = [1500, 760]

  test('the spike content keeps the spike size', () => {
    expect(fitFont(11, 35, w, h)).toEqual({ size: 46, fits: true })
  })

  test('more rows or wider lines shrink the font', () => {
    const tall = fitFont(16, 35, w, h)
    expect(tall.fits).toBe(true)
    expect(tall.size).toBeLessThan(46)
    expect(tall.size * 1.5 * 16).toBeLessThanOrEqual(h)
    const wide = fitFont(5, 80, w, h)
    expect(wide.fits).toBe(true)
    expect(wide.size * 0.6 * 80).toBeLessThanOrEqual(w)
  })

  test('content that clips even at the floor does not fit', () => {
    expect(fitFont(40, 35, w, h)).toEqual({ size: MIN_FONT, fits: false })
    expect(fitFont(5, 200, w, h)).toEqual({ size: MIN_FONT, fits: false })
  })
})

describe('crt prompt rows', () => {
  test('7 boot lines, READY, 2 prompts and the cursor row keep 46 px', () => {
    expect(fitFont(7 + 1 + 2 + 1, 35, 1500, 760)).toEqual({ size: 46, fits: true })
  })

  test('the cursor centre sits on its row, half a row down, .3 em in', () => {
    expect(cursorCentre(0, 46)).toEqual({ x: 210 + 0.3 * 46, y: 180 + 0.5 * 69 })
    expect(cursorCentre(10, 40).y - cursorCentre(9, 40).y).toBe(60)
  })
})

describe('crt colour', () => {
  test('named colours map to tokens or teal, any other string passes through, none is green', () => {
    expect(crtColor()).toBe('var(--k-phosphor)')
    expect(crtColor('green')).toBe('var(--k-phosphor)')
    expect(crtColor('amber')).toBe('var(--k-phosphor-amber)')
    expect(crtColor('teal')).toBe('#009A9B')
    expect(crtColor('rgb(1, 2, 3)')).toBe('rgb(1, 2, 3)')
  })
})
