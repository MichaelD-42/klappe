import { afterEach, expect, test } from 'vitest'
import { compareTable } from '../../src/fx/comparetable'
import { exerciseCard } from '../../src/fx/exercisecard'

// A fake DOM: every element is recorded, with its style and text.
const setup = (height = 100, reducedMotion = false) => {
  const made: any[] = []
  const el = (): any => {
    const e: any = { style: {}, attrs: {}, append() {}, setAttribute: (k: string, v: string) => (e.attrs[k] = v), appendChild: (c: unknown) => c, get offsetHeight() { return height } }
    return e
  }
  ;(globalThis as any).document = { createElement: () => (made.push(el()), made[made.length - 1]) }
  const problems: string[] = []
  const ctx: any = { svg: el(), html: el(), problem: (m: string) => problems.push(m), deck: { lang: 'en', intensity: 'calm' }, reducedMotion }
  return { made, problems, ctx }
}
afterEach(() => delete (globalThis as any).document)

// A timeline that records what is added.
const rec = () => {
  const log: { op: string; target: any; from?: any; vars: any; at?: number }[] = []
  const tl: any = {
    duration: () => 0,
    to: (target: any, vars: any, at?: number) => log.push({ op: 'to', target, vars, at }),
    set: (target: any, vars: any, at?: number) => log.push({ op: 'set', target, vars, at }),
    fromTo: (target: any, from: any, vars: any, at?: number) => log.push({ op: 'fromTo', target, from, vars, at }),
  }
  return { tl, log }
}

const columns = ['A', 'B']
const rows = [
  { label: 'One', cells: [true, false] },
  { label: 'Two', cells: ['text', true] },
  { label: 'Three', cells: [false, false] },
]
const label = (made: any[], text: string) => made.find((e) => e.textContent === text)

test('ticks are --k-ok, crosses --k-bad, the header --k-muted; a text cell keeps its text', () => {
  const { made, ctx } = setup()
  compareTable(ctx, { columns, rows, x: 0, y: 0, w: 1000 })
  const marks = made.filter((e) => e.attrs.role === 'img')
  expect(marks.map((m) => m.style.color)).toEqual(['var(--k-ok)', 'var(--k-bad)', 'var(--k-ok)', 'var(--k-bad)', 'var(--k-bad)'])
  expect(marks.map((m) => m.attrs['aria-label'])).toEqual(['yes', 'no', 'yes', 'no', 'no'])
  expect(made.some((e) => e.style.color === 'var(--k-muted)')).toBe(true)
  expect(label(made, 'text')).toBeTruthy()
})

test('the cue follows the steps even when the row adders are made out of order', () => {
  const { made, ctx } = setup()
  const t = compareTable(ctx, { columns, rows, x: 0, y: 0, w: 1000 })
  const [r2, r0, r1] = [t.row(2), t.row(0), t.row(1)]
  const a = rec()
  r0(a.tl)
  expect(a.log.filter((l) => l.op === 'set').map((l) => [l.target.textContent, l.vars.color])).toEqual([['One', 'var(--k-accent)']])
  const b = rec()
  r1(b.tl)
  expect(b.log.filter((l) => l.op === 'set').map((l) => [l.target.textContent, l.vars.color])).toEqual([['One', 'var(--k-fg)'], ['Two', 'var(--k-accent)']])
  const c = rec()
  r2(c.tl)
  expect(c.log.filter((l) => l.op === 'set').map((l) => [l.target.textContent, l.vars.color])).toEqual([['Two', 'var(--k-fg)'], ['Three', 'var(--k-accent)']])
  expect(label(made, 'Three')).toBeTruthy()
})

test('a row lands its marks with a pop; with reduced motion they only fade', () => {
  for (const reduced of [false, true]) {
    const { ctx } = setup(100, reduced)
    const { tl, log } = rec()
    compareTable(ctx, { columns, rows, x: 0, y: 0, w: 1000 }).row(0)(tl)
    const pop = log.find((l) => Array.isArray(l.target))!
    expect(pop.target).toHaveLength(2)
    expect(pop.from.scale).toBe(reduced ? 1 : 0.4)
    expect(pop.vars.immediateRender).toBe(false)
  }
})

test('a short row, a missing row and a table too tall each report a problem', () => {
  const { problems, ctx } = setup()
  const t = compareTable(ctx, { columns, rows: [{ label: 'Short', cells: [true] }], x: 0, y: 0, w: 1000 })
  t.row(5)(rec().tl)
  expect(problems).toEqual(['compareTable: row 0 has 1 cells for 2 columns', 'compareTable: no row 5'])
  const tall = setup(5000)
  compareTable(tall.ctx, { columns, rows, x: 0, y: 0, w: 1000, h: 300 }).show(rec().tl)
  expect(tall.problems).toEqual(['compareTable: 3 rows do not fit 300px at 20px text'])
})

test('the card shows its time box through the strings table and the group as written', () => {
  const { made, ctx } = setup()
  exerciseCard(ctx, { title: 'T', tasks: ['a', 'b'], minutes: 15, group: 'pairs', x: 0, y: 0, w: 1000 })
  expect(label(made, '15 min')).toBeTruthy()
  expect(label(made, 'pairs')).toBeTruthy()
  expect(label(made, '1.')).toBeTruthy()
  expect(label(made, '2.')).toBeTruthy()
})

test('extra(i) reveals that item; reduced motion drops the slide; a missing extra is a problem', () => {
  for (const reduced of [false, true]) {
    const { made, problems, ctx } = setup(100, reduced)
    const c = exerciseCard(ctx, { title: 'T', tasks: ['a'], extras: ['x', 'y'], x: 0, y: 0, w: 1000 })
    const { tl, log } = rec()
    c.extra(1)(tl)
    const plus = made.filter((e) => e.textContent === '+')
    expect(plus).toHaveLength(2)
    expect(log).toHaveLength(1)
    expect(log[0].from).toMatchObject({ autoAlpha: 0, y: reduced ? 0 : 16 })
    c.extra(3)(rec().tl)
    expect(problems).toEqual(['exerciseCard: no extra 3'])
  }
})

test('a card shrinks to a size between 20 and 36 px when it fits there, and reports one too tall at the floor', () => {
  const made: any[] = []
  const tall = (): any => ({ style: {}, append() {}, setAttribute() {}, appendChild: (c: unknown) => c, get offsetHeight() { return parseInt(this.style.fontSize || '36') * 10 } })
  ;(globalThis as any).document = { createElement: () => (made.push(tall()), made[made.length - 1]) }
  const problems: string[] = []
  const ctx: any = { html: tall(), problem: (m: string) => problems.push(m), deck: { lang: 'en' } }
  exerciseCard(ctx, { title: 'T', tasks: ['a'], x: 0, y: 0, w: 1000, h: 280 }).show(rec().tl)
  expect(made[0].style.fontSize).toBe('28px')
  expect(problems).toEqual([])
  exerciseCard(ctx, { title: 'Big', tasks: ['a'], x: 0, y: 0, w: 1000, h: 100 }).show(rec().tl)
  expect(problems).toEqual(['exerciseCard: "Big" does not fit 100px at 20px text'])
})
