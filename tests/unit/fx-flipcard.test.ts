import { gsap } from 'gsap'
import { afterEach, expect, test, vi } from 'vitest'
import { flipCard } from '../../src/fx/flipcard'
import type { Ctx } from '../../src/types'

// No DOM here: plain objects stand in for the elements, and GSAP tweens their properties directly.
interface Fake { style: Record<string, string>; kids: Fake[]; attrs: string[]; textContent: string; [k: string]: unknown }
const fake = (): Fake => {
  const e: Fake = { style: {}, kids: [], attrs: [], textContent: '' }
  e.appendChild = (c: Fake) => (e.kids.push(c), c)
  e.setAttribute = (a: string) => e.attrs.push(a)
  Object.defineProperty(e, 'firstElementChild', { get: () => e.kids[0] }) // fitting reads the text span; it measures 0 here
  return e
}
afterEach(() => vi.unstubAllGlobals())

function build(reducedMotion: boolean) {
  vi.stubGlobal('document', { createElement: fake })
  const html = fake()
  const c = flipCard({ html, reducedMotion } as unknown as Ctx, { x: 0, y: 0, front: 'Q?', back: 'A.' })
  const root = html.kids[0]
  const card = root.kids[0]
  const [front, back] = card.kids
  const tl = gsap.timeline({ paused: true })
  const ends: number[] = []
  for (const add of [c.show, c.flip, c.flip, c.flip]) (add(tl), ends.push(tl.duration()))
  return { card, front, back, tl, ends }
}

test('each flip turns the card a further half turn, and a seek lands on the same angle as a play', () => {
  const { card, back, tl, ends } = build(false)
  expect(back.rotationY).toBe(180) // the back faces away
  for (let t = 0; t <= tl.duration() + 1e-9; t += 0.05) tl.seek(t) // play forward
  expect(card.rotationY).toBe(540)
  // Seek back and forth in any order: front, back, front, back.
  for (const [i, angle] of [[2, 360], [0, 0], [3, 540], [1, 180], [2, 360]] as const) {
    tl.seek(ends[i])
    expect(card.rotationY).toBe(angle)
  }
})

test('with reduced motion the faces crossfade and nothing turns', () => {
  const { card, front, back, tl, ends } = build(true)
  expect(back.rotationY).toBeUndefined()
  for (const [i, f, b] of [[0, 1, 0], [1, 0, 1], [2, 1, 0], [3, 0, 1], [0, 1, 0], [2, 1, 0]] as const) {
    tl.seek(ends[i])
    expect([front.autoAlpha ?? 1, back.autoAlpha]).toEqual([f, b])
  }
  expect(card.rotationY).toBeUndefined()
})
