import { afterEach, expect, test } from 'vitest'
import { gsap } from 'gsap'
import { agenda } from '../../src/fx/agenda'

const rows = [
  { from: '09:00', to: '09:45', title: 'Basics', current: false },
  { from: '09:45', to: '10:30', title: 'Practice', current: true },
  { from: '10:30', to: '11:00', title: 'Wrap-up', current: false },
]
const el = (height = 100): any => ({ append() {}, setAttribute() {}, style: {}, appendChild: (c: unknown) => c, offsetHeight: height, offsetTop: 0 })
const setup = (height?: number) => {
  const problems: string[] = []
  const made: any[] = []
  ;(globalThis as any).document = { createElement: () => (made.push(el(height)), made[made.length - 1]), createElementNS: () => el() }
  return { problems, made, ctx: { svg: el(), html: el(), problem: (m: string) => problems.push(m) } as any }
}
afterEach(() => delete (globalThis as any).document)

test('colours: past muted, current accent, future fg', () => {
  const { made, ctx } = setup()
  agenda(ctx, { rows, x: 0, y: 0, w: 1000 })
  const colors = made.filter((e) => e.style.color).map((e) => e.style.color)
  expect(colors).toEqual(['var(--k-muted)', 'var(--k-accent)', 'var(--k-fg)'])
})

test('an unknown current reports the title', () => {
  const { problems, ctx } = setup()
  agenda(ctx, { rows, x: 0, y: 0, w: 1000, current: 'Nope' })
  expect(problems).toEqual(['agenda: no row "Nope"'])
})

test('too many rows for the rect report a problem at the floor', () => {
  const { problems, ctx } = setup(5000)
  const h = agenda(ctx, { rows, x: 0, y: 0, w: 1000, h: 300 })
  h.show(gsap.timeline())
  expect(problems).toEqual(['agenda: 3 rows do not fit 300px at 20px text'])
})
