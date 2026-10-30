import { afterEach, expect, test, vi } from 'vitest'
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

// A timeline that records what is added, so tests can see what show and tick do.
const rec = () => {
  const log: { op: string; target: any; vars?: any; at?: number }[] = []
  const tl: any = {
    duration: () => 0,
    to: (target: any, vars: any, at?: number) => log.push({ op: 'to', target, vars, at }),
    set: (target: any, vars: any, at?: number) => log.push({ op: 'set', target, vars, at }),
  }
  return { tl, log }
}
const drawn: any[] = []
vi.mock('../../src/fx/draw', () => ({ drawOn: (els: any) => () => drawn.push(els), typeSize: (_role: string, px: number) => px }))
function build(extra: { items?: typeof items } = {}) {
  const made: any[] = []
  const svgs: any[] = []
  ;(globalThis as any).document = { createElement: () => (made.push(el()), made[made.length - 1]), createElementNS: () => (svgs.push(el()), svgs[svgs.length - 1]) }
  const ctx: any = { svg: el(), html: el(), problem: () => {} }
  const h = checklist(ctx, { items: extra.items ?? [{ text: 'A', done: true }, { text: 'B' }, { text: 'C' }], x: 0, y: 0, w: 1000 })
  // svg elements per item are created in order: svg, rect, check, cross
  const item = (i: number) => ({ box: svgs[i * 4 + 1], mark: svgs[i * 4 + 2], cross: svgs[i * 4 + 3], text: made[2 + i * 2] })
  return { h, item }
}

test('show draws the check of a done item and only that', () => {
  drawn.length = 0
  const { h, item } = build()
  const { tl } = rec()
  h.show(tl)
  expect(drawn).toEqual([item(0).mark])
})

test('tick draws the check, brightens the text and settles the previous box', () => {
  drawn.length = 0
  const { h, item } = build()
  const a = rec()
  const t1 = h.tick(1)
  const t2 = h.tick(2)
  t1(a.tl)
  expect(drawn).toEqual([item(1).mark])
  expect(a.log.find((l) => l.target === item(1).box)?.vars.stroke).toBe('var(--k-accent)')
  expect(a.log.find((l) => l.target === item(1).text)?.vars.color).toBe('var(--k-fg)')
  const b = rec()
  t2(b.tl)
  expect(b.log.find((l) => l.target === item(1).box)?.vars.stroke).toBe('var(--k-line)')
  expect(b.log.find((l) => l.target === item(2).box)?.vars.stroke).toBe('var(--k-accent)')
})

test('tick on a done item does not redraw its check', () => {
  drawn.length = 0
  const { h, item } = build()
  const { tl, log } = rec()
  h.tick(0)(tl)
  expect(drawn).toEqual([])
  expect(log.some((l) => l.target === item(0).mark)).toBe(false)
})

test('the list shrinks to a size between 20 and 40 px when it fits there', () => {
  const root: any[] = []
  const tall = (): any => ({ append() {}, setAttribute() {}, style: {}, appendChild: (c: unknown) => c, get offsetHeight() { return parseInt(this.style.fontSize || '40') * 10 } })
  ;(globalThis as any).document = { createElement: () => (root.push(tall()), root[root.length - 1]), createElementNS: () => el() }
  const problems: string[] = []
  const ctx: any = { svg: el(), html: el(), problem: (m: string) => problems.push(m) }
  checklist(ctx, { items, x: 0, y: 0, w: 1000, h: 300 }).show(rec().tl)
  expect(root[0].style.fontSize).toBe('30px')
  expect(problems).toEqual([])
})
