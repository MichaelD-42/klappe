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

const rec = () => {
  const log: { op: string; target: any; from?: any; vars?: any }[] = []
  const tl: any = {
    duration: () => 0,
    to: (target: any, vars: any) => log.push({ op: 'to', target, vars }),
    set: (target: any, vars: any) => log.push({ op: 'set', target, vars }),
    fromTo: (target: any, from: any, vars: any) => log.push({ op: 'fromTo', target, from, vars }),
  }
  return { tl, log }
}
// Elements get an offsetTop by creation order, so rows sit at distinct heights.
const laid = () => {
  const made: any[] = []
  ;(globalThis as any).document = {
    createElement: () => (made.push({ ...el(), offsetTop: made.length * 10, offsetHeight: 50 }), made[made.length - 1]),
    createElementNS: () => el(),
  }
  return { made, ctx: { svg: el(), html: el(), problem: () => {} } as any }
}

test('the marker lands on the current row, slides from the first row', () => {
  const { made, ctx } = laid()
  const { tl, log } = rec()
  agenda(ctx, { rows, x: 0, y: 0, w: 1000 }).show(tl)
  const bar = made[made.length - 1]
  const [first, cur] = [made[1], made[4]] // root, then row/time/text per row
  const slide = log.find((l) => l.op === 'fromTo')!
  expect(slide.target).toBe(bar)
  expect(bar.style.top).toBe(`${cur.offsetTop}px`)
  expect(slide.from.y).toBe(first.offsetTop - cur.offsetTop)
  expect(slide.vars.y).toBe(0)
})

test('with no current row there is no marker', () => {
  const { made, ctx } = laid()
  const { tl, log } = rec()
  agenda(ctx, { rows: rows.map((r) => ({ ...r, current: false })), x: 0, y: 0, w: 1000 }).show(tl)
  expect(log.some((l) => l.op === 'fromTo' || l.target === made[made.length - 1])).toBe(false)
})

test('the rows shrink to a size between 20 and 40 px when they fit there', () => {
  const made: any[] = []
  const tall = (): any => ({ append() {}, setAttribute() {}, style: {}, appendChild: (c: unknown) => c, offsetTop: 0, get offsetHeight() { return parseInt(this.style.fontSize || '40') * 10 } })
  ;(globalThis as any).document = { createElement: () => (made.push(tall()), made[made.length - 1]), createElementNS: () => el() }
  const problems: string[] = []
  const ctx: any = { svg: el(), html: el(), problem: (m: string) => problems.push(m) }
  agenda(ctx, { rows, x: 0, y: 0, w: 1000, h: 300 }).show(rec().tl)
  expect(made[0].style.fontSize).toBe('30px')
  expect(problems).toEqual([])
})

test('the handle gives the root as el and one element per row', () => {
  const { made, ctx } = setup()
  const h = agenda(ctx, { rows, x: 0, y: 0, w: 1000 })
  expect(h.el).toBe(made[0])
  expect(h.rows.map((r) => r.style.color)).toEqual(['var(--k-muted)', 'var(--k-accent)', 'var(--k-fg)'])
})

test('move slides the marker from the current row to another and moves the row colours', () => {
  const { made, ctx } = laid()
  const { tl, log } = rec()
  const a = agenda(ctx, { rows, x: 0, y: 0, w: 1000 })
  a.show(tl)
  const n = log.length
  a.move(tl, 2)
  const bar = made[made.length - 1]
  const top = (i: number) => a.rows[i].offsetTop
  const slide = log.slice(n).find((l) => l.op === 'fromTo')!
  expect(slide.target).toBe(bar)
  expect(slide.from.y).toBe(0)
  expect(slide.vars.y).toBe(top(2) - top(1))
  expect(slide.vars.immediateRender).toBe(false)
  const colours = log.slice(n).filter((l) => l.op === 'set').map((l) => [a.rows.indexOf(l.target), l.vars.color, l.vars.immediateRender])
  expect(colours).toEqual([[1, 'var(--k-muted)', false], [2, 'var(--k-accent)', false]])
})

test('a second move starts where the first one ended', () => {
  const { ctx } = laid()
  const { tl, log } = rec()
  const a = agenda(ctx, { rows, x: 0, y: 0, w: 1000 })
  a.show(tl)
  a.move(tl, 2)
  const n = log.length
  a.move(tl, 0)
  const top = (i: number) => a.rows[i].offsetTop
  const slide = log.slice(n).find((l) => l.op === 'fromTo')!
  expect([slide.from.y, slide.vars.y]).toEqual([top(2) - top(1), top(0) - top(1)])
  const colours = log.slice(n).filter((l) => l.op === 'set').map((l) => [a.rows.indexOf(l.target), l.vars.color])
  expect(colours).toEqual([[0, 'var(--k-accent)'], [1, 'var(--k-fg)'], [2, 'var(--k-fg)']])
})

test('move to a row that does not exist reports it and moves nothing', () => {
  const problems: string[] = []
  const { ctx } = laid()
  ctx.problem = (m: string) => problems.push(m)
  const { tl, log } = rec()
  const a = agenda(ctx, { rows, x: 0, y: 0, w: 1000 })
  a.show(tl)
  const n = log.length
  a.move(tl, 3)
  expect(problems).toEqual(['agenda: no row 3'])
  expect(log.slice(n).some((l) => l.op === 'fromTo' || l.vars?.color)).toBe(false)
})

test('move with no current row shows the marker on the target row', () => {
  const { made, ctx } = laid()
  const { tl, log } = rec()
  const a = agenda(ctx, { rows: rows.map((r) => ({ ...r, current: false })), x: 0, y: 0, w: 1000 })
  a.show(tl)
  a.move(tl, 1)
  const bar = made[made.length - 1]
  expect(bar.style.top).toBe(`${a.rows[1].offsetTop}px`)
  expect(log.some((l) => l.op === 'set' && l.target === bar && l.vars.autoAlpha === 1)).toBe(true)
  const colours = log.filter((l) => l.op === 'set' && l.vars.color).map((l) => [a.rows.indexOf(l.target), l.vars.color])
  expect(colours).toEqual([[0, 'var(--k-muted)'], [1, 'var(--k-accent)']])
})
