import { gsap } from 'gsap'
import { afterEach, expect, test, vi } from 'vitest'
import { hide, show, text } from '../../src/fx/basics'

afterEach(() => vi.unstubAllGlobals())

const el = (n = 0) => ({ autoAlpha: n }) as unknown as Element

test('show fades a list in over 0.6 s by default; hide fades out over the given duration', () => {
  const [a, b] = [el(), el()]
  const tl = gsap.timeline({ paused: true })
  show([a, b])(tl)
  hide(a, { duration: 0.2 })(tl)
  const [s, h] = tl.getChildren() as gsap.core.Tween[]
  expect(s.targets()).toEqual([a, b])
  expect(s.vars).toMatchObject({ autoAlpha: 1, duration: 0.6 })
  expect(h.targets()).toEqual([a])
  expect(h.vars).toMatchObject({ autoAlpha: 0, duration: 0.2 })
  expect(tl.duration()).toBeCloseTo(0.8)
})

test('making an adder adds nothing and changes nothing; only calling it does', () => {
  const a = el()
  const tl = gsap.timeline({ paused: true })
  const s = show(a)
  hide(a)
  expect(tl.getChildren()).toEqual([])
  expect((a as unknown as { autoAlpha: number }).autoAlpha).toBe(0)
  s(tl)
  expect(tl.getChildren()).toHaveLength(1)
})

// No DOM: a plain object stands in for the div, and only --k-fg and --k-accent resolve.
test('text reports a color that is not a token name or does not resolve, and falls back to --k-fg', () => {
  const tokens: Record<string, string> = { '--k-fg': 'rgb(255, 255, 255)', '--k-accent': 'rgb(0, 0, 255)' }
  vi.stubGlobal('document', { createElement: () => ({ style: {} }) })
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: (n: string) => tokens[n] ?? '' }))
  const problem = vi.fn()
  const ctx = { html: { appendChild: (e: unknown) => e }, problem } as never
  const color = (c: string) => text(ctx, { text: 'Hi', x: 0, y: 0, w: 100, color: c }).el.style.color
  expect(color('--k-accent')).toBe('var(--k-accent)')
  expect(color('--k-nope')).toBe('var(--k-fg)')
  expect(color('red')).toBe('var(--k-fg)')
  expect(problem.mock.calls).toEqual([['text: unknown token "--k-nope"'], ['text: color "red" is not a --k-* token name']])
})

// A deck's own class (deck.css) styles the box; only the options given are set inline, over it.
test('text with a class leaves font and colour to the class, except the options given', () => {
  vi.stubGlobal('document', { createElement: () => ({ style: {} }) })
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => 'x' }))
  const ctx = { html: { appendChild: (e: unknown) => e }, problem: vi.fn() } as never
  const plain = text(ctx, { text: 'Hi', x: 10, y: 20, w: 100, class: 'lead' }).el
  expect(plain.className).toBe('lead')
  expect(plain.style).toMatchObject({ position: 'absolute', left: '10px', top: '20px', width: '100px' })
  expect(plain.style.font).toBeUndefined()
  expect(plain.style.color).toBeUndefined()
  const sized = text(ctx, { text: 'Hi', x: 0, y: 0, w: 100, class: 'lead', size: 30, color: '--k-accent' }).el
  expect(sized.style).toMatchObject({ fontSize: '30px', color: 'var(--k-accent)' })
  expect(sized.style.fontWeight).toBeUndefined()
})
