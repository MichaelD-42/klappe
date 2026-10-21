import { afterEach, expect, test } from 'vitest'
import { gsap } from 'gsap'
import { checklist } from '../../src/fx/checklist'

const items = [{ text: 'Backup verified', done: true }, { text: 'Restore tested' }]
const el = (height = 100): any => ({ append() {}, setAttribute() {}, style: {}, appendChild: (c: unknown) => c, offsetHeight: height })
const setup = (height?: number) => {
  const problems: string[] = []
  const made: any[] = []
  ;(globalThis as any).document = { createElement: () => (made.push(el(height)), made[made.length - 1]), createElementNS: () => el() }
  return { problems, made, ctx: { svg: el(), html: el(), problem: (m: string) => problems.push(m) } as any }
}
afterEach(() => delete (globalThis as any).document)

test('item text starts muted, a done item starts bright', () => {
  const { made, ctx } = setup()
  checklist(ctx, { items, x: 0, y: 0, w: 1000 })
  expect(made.filter((e) => e.style.color).map((e) => e.style.color)).toEqual(['var(--k-fg)', 'var(--k-muted)'])
})

test('tick of an item that is not there reports it', () => {
  const { problems, ctx } = setup()
  checklist(ctx, { items, x: 0, y: 0, w: 1000 }).tick(5)(gsap.timeline())
  expect(problems).toEqual(['checklist: no item 5'])
})

test('a list too tall for its rect reports a problem at the floor', () => {
  const { problems, ctx } = setup(5000)
  checklist(ctx, { items, x: 0, y: 0, w: 1000, h: 300 }).show(gsap.timeline())
  expect(problems).toEqual(['checklist: 2 items do not fit 300px at 20px text'])
})
