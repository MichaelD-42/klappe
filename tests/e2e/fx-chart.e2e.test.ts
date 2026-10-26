import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-chart#${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

// The fixture's one missing dataset is its only problem; everything else must pass.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: play equals seek and charts are legible at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-chart`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([
      'sections/10-a/60-missing/scene.ts: chart: DATA MISSING: data/missing.csv',
      'sections/10-a/80-bad/scene.ts: chart: DATA ERROR: data/bad.csv (row 2, column units not a number)',
      'sections/10-a/90-null/scene.ts: chart: DATA ERROR: data/null.json (not an array of rows)',
    ])
    expect(r.steps).toBe(66)
  })

test('the source reaches the notes: origin from the CSV, the JSON, or not stated', async () => {
  const page = await open('/a/bar/1')
  const notes = await page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll<SVGElement>('[data-k-chart]')].map((g) => [g.closest('[data-scene]')!.getAttribute('data-scene'), g.dataset.kNote]),
    ),
  )
  expect(notes.bar).toBe('Source: data/quarters.csv — klappe demo sample')
  expect(notes.stacked).toBe('Source: data/mix.json — klappe demo sample')
  expect(notes.line).toBe('Source: data/trend.csv — origin not stated')
  expect(notes.timeline).toBe('Source: data/plan.csv — origin not stated')
  await page.close()
})

test('a waterfall starts plain, signs its changes and closes with a total', async () => {
  const page = await open('/a/waterfall/3')
  await page.waitForFunction(() => window.klappe.stepper.index === 11)
  const values = await page.evaluate(() =>
    [...document.querySelectorAll('[data-k-chart="waterfall"] [data-k-text]')].map((e) => e.textContent),
  )
  expect(values).toEqual(['100', '−25', '+15', '−30', '+20', '80'])
  await page.close()
})

// bars: the bar rects in data order (waterfall: then the total; stacked: series by series), none for a line.
test('the handle returns the bars in data order', async () => {
  const page = await open('/a/bar/1')
  const r = await page.evaluate(() =>
    Object.fromEntries(
      ['bar', 'stacked', 'line', 'waterfall', 'timeline'].map((t) => {
        const bars = [...document.querySelectorAll<SVGRectElement>(`[data-scene="${t}"] [data-k-chart="${t}"] [data-bar]`)]
        return [t, { n: bars.length, ordered: bars.every((b, i) => b.dataset.bar === String(i)), x: bars.map((b) => +b.getAttribute('x')!), y: bars.map((b) => +b.getAttribute('y')!) }]
      }),
    ),
  )
  expect([r.bar.n, r.stacked.n, r.line.n, r.waterfall.n, r.timeline.n]).toEqual([4, 12, 0, 6, 3])
  for (const t of ['bar', 'stacked', 'waterfall', 'timeline']) expect(r[t].ordered).toBe(true)
  for (const t of ['bar', 'waterfall']) expect(r[t].x).toEqual([...r[t].x].sort((a, b) => a - b))
  expect(r.timeline.y).toEqual([...r.timeline.y].sort((a, b) => a - b))
  await page.close()
})

test('a bad cell shows DATA ERROR and draws nothing', async () => {
  const page = await open('/a/bad/1')
  await page.waitForFunction(() => window.klappe.stepper.index === 20)
  const box = page.locator('div[data-k-src="data/bad.csv"]')
  expect(await box.textContent()).toBe('DATA ERROR: data/bad.csv')
  expect(await box.isVisible()).toBe(true)
  expect(await page.evaluate(() => document.querySelectorAll('[data-k-src="data/bad.csv"][data-k-chart]').length)).toBe(0)
  await page.close()
})

test('values count up to the data and the source is in the DOM', async () => {
  const page = await open('/a/bar/3')
  await page.waitForFunction(() => window.klappe.stepper.index === 2)
  const r = await page.evaluate(() => {
    const g = document.querySelector('[data-k-chart="bar"]')!
    return {
      src: g.getAttribute('data-k-src'),
      values: [...g.querySelectorAll('[data-k-text]')].map((e) => e.textContent),
      text: g.textContent,
    }
  })
  expect(r.src).toBe('data/quarters.csv')
  expect(r.values).toEqual(['120', '185', '−40', '240'])
  expect(r.text).toContain('Sample data')
  await page.close()
})

test('the Sample data label uses --k-warn and ends inside the chart rect', async () => {
  const page = await open('/a/bar/1')
  const r = await page.evaluate(() => {
    const s = [...document.querySelectorAll<SVGTextElement>('[data-k-chart="bar"] text')].find((e) => e.textContent === 'Sample data')!
    const b = s.getBBox()
    return { fill: s.style.fill, right: b.x + b.width }
  })
  expect(r.fill).toBe('var(--k-warn)')
  expect(r.right).toBeLessThanOrEqual(160 + 1600 - 20) // the fixture rect ends at x 1760
  await page.close()
})

test('a missing dataset shows DATA MISSING with the file name', async () => {
  const page = await open('/a/missing/1')
  await page.waitForFunction(() => window.klappe.stepper.index === 15)
  const box = page.locator('div[data-k-src="data/missing.csv"]')
  expect(await box.textContent()).toBe('DATA MISSING: data/missing.csv')
  expect(await box.isVisible()).toBe(true)
  const size = await box.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))
  expect(size).toBeGreaterThanOrEqual(40)
  await page.close()
})

test('a Markdown chart link draws a bar chart in the media slot', async () => {
  const page = await open('/a/slot/2')
  await page.waitForFunction(() => window.klappe.stepper.index === 19)
  const r = await page.evaluate(() => {
    const g = document.querySelector('g[data-k-media="2"] [data-k-chart="bar"]')!
    // Rendered size: computed font size times the full screen transform (stage fit, camera, wrappers).
    const sizes = [...g.querySelectorAll('text')].map((t) => {
      const m = t.getScreenCTM()!
      return parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.a, m.b)
    })
    return { bars: g.querySelectorAll('rect').length, smallest: Math.min(...sizes) }
  })
  console.log(`slot chart: smallest text ${r.smallest.toFixed(1)} px at 1366`)
  expect(r.bars).toBe(4)
  expect(r.smallest).toBeGreaterThanOrEqual(14)
  await page.close()
})

test('a donut draws every slice whole, and its legend gives each value and share', async () => {
  const page = await open('/a/donut/3')
  await page.waitForTimeout(1500)
  const r = await page.evaluate(() => {
    const g = document.querySelector('[data-k-chart="donut"]')!
    const arcs = [...g.querySelectorAll<SVGCircleElement>('circle')]
    const texts = [...g.querySelectorAll('text')].map((t) => t.textContent)
    return {
      arcs: arcs.length,
      drawn: arcs.every((a) => Math.abs(parseFloat(getComputedStyle(a).strokeDashoffset)) < 1e-3),
      total: arcs.reduce((s, a) => s + parseFloat(getComputedStyle(a).strokeDasharray), 0),
      texts,
    }
  })
  expect(r.arcs).toBe(4)
  expect(r.drawn).toBe(true)
  expect(r.total).toBeCloseTo(1, 1) // the whole turn, less hairline gaps
  expect(r.texts).toEqual(expect.arrayContaining(['100', 'Build', '50', '50 %', '20', '20 %', '25', '25 %', '5', '5 %']))
  await page.close()
})

test('a slope draws rising lines apart from falling ones and keeps close labels apart', async () => {
  const page = await open('/a/slope/3')
  await page.waitForTimeout(1500)
  const r = await page.evaluate(() => {
    const g = document.querySelector('[data-k-chart="slope"]')!
    const lines = [...g.querySelectorAll<SVGPathElement>('path')].filter((p) => p.getAttribute('d')?.startsWith('M'))
    const strokes = lines.map((l) => getComputedStyle(l).stroke)
    // The right-hand values: text-anchor start, right of the plot.
    const right = [...g.querySelectorAll<SVGTextElement>('text[data-k-text]')].filter((t) => !t.getAttribute('text-anchor') && t.getBBox().x > 900)
    const ys = right.map((t) => t.getBBox()).sort((a, b) => a.y - b.y)
    let overlap = false
    for (let i = 1; i < ys.length; i++) if (ys[i].y < ys[i - 1].y + ys[i - 1].height) overlap = true
    return { strokes, overlap, values: right.map((t) => t.textContent) }
  })
  // North, South, East fall; West rises.
  expect(new Set(r.strokes.slice(0, 3)).size).toBe(1)
  expect(r.strokes[3]).not.toBe(r.strokes[0])
  expect(r.overlap).toBe(false)
  expect(r.values).toEqual(['12.0', '13.0', '12.5', '18.0']) // one decimal for all, as every chart does
  await page.close()
})

// A chart does nothing of its own under reduced motion: its fades and grows are short and stay in place.
test('walk: charts pass under reduced motion too', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-chart&reducedmotion=1`, { w: 1920, h: 1080 })
  expect(r.errors).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
}, 120_000)

test('a funnel sizes stages by value and gives the conversion between them', async () => {
  const page = await open('/a/funnel/3')
  await page.waitForFunction(() => window.klappe.stepper.index === 34)
  await settle(page)
  const r = await page.evaluate(() => {
    const g = document.querySelector('[data-k-chart="funnel"]')!
    return {
      widths: [...g.querySelectorAll<SVGRectElement>('[data-bar]')].map((b) => +b.getAttribute('width')!),
      values: [...g.querySelectorAll('[data-k-text]')].map((e) => e.textContent),
      // Each stage value: is it inside its bar, or does it start just right of it?
      beside: [...g.querySelectorAll<SVGRectElement>('[data-bar]')].map((b, i) => {
        const v = [...g.querySelectorAll<SVGTextElement>('[data-k-text]')].filter((e) => !e.textContent!.includes('%') && e.textContent !== '–')[i].getBBox()
        const [x0, x1] = [+b.getAttribute('x')!, +b.getAttribute('x')! + +b.getAttribute('width')!]
        return v.x > x0 && v.x + v.width < x1 ? 'inside' : v.x - x1 > 0 && v.x - x1 < 24 ? 'right' : 'far'
      }),
    }
  })
  expect(r.beside).toEqual(['inside', 'inside', 'inside', 'right', 'right'])
  const [w0, w1, w2, w3] = r.widths
  expect(w1 / w0).toBeCloseTo(0.4)
  expect(w2 / w0).toBeCloseTo(0.1)
  expect(w3).toBe(2) // a zero stage is a hairline, not nothing
  expect(r.values).toEqual(['1,000', '400', '40 %', '100', '25 %', '0', '0 %', '0', '–'])
  await page.close()
})

test('a sankey lays nodes in columns and lights one flow at a time, by step order', async () => {
  const lit = async (step: number, index: number) => {
    const page = await open(`/a/sankey/${step}`)
    await page.waitForFunction((i) => window.klappe.stepper.index === i, index)
    await settle(page)
    const r = await page.evaluate(() => {
      const g = document.querySelector('[data-k-chart="sankey"]')!
      const accents = [...g.querySelectorAll<SVGPathElement>('path')].filter((p) => p.style.fill === 'var(--k-accent)')
      return {
        nodes: [...g.querySelectorAll<SVGRectElement>('[data-bar]')].map((b) => +b.getAttribute('x')!),
        shown: accents.map((p) => +getComputedStyle(p).opacity),
      }
    })
    await page.close()
    return r
  }
  // Node names fade in with their nodes on grow (step 2), not with the axes (step 1).
  for (const [step, index, shown] of [[1, 35, false], [2, 36, true]] as const) {
    const page = await open('/a/sankey/' + step)
    await page.waitForFunction((i) => window.klappe.stepper.index === i, index)
    await settle(page)
    const names = await page.evaluate(() =>
      [...document.querySelectorAll<SVGTextElement>('[data-k-chart="sankey"] text[font-weight="700"]')].slice(1).map((e) => getComputedStyle(e).visibility === 'visible'),
    )
    expect(names.length).toBe(6)
    expect(names.every((v) => v === shown), 'step ' + step).toBe(true)
    await page.close()
  }
  const four = await lit(4, 38)
  // Ads, Signup, Search, Bounce, Paid, Churn: columns 0, 1, 0, 1, 2, 2.
  const [ads, signup, search, bounce, paid, churn] = four.nodes
  expect([ads === search, signup === bounce, paid === churn, ads < signup && signup < paid]).toEqual([true, true, true, true])
  expect(four.shown).toEqual([1, 0, 0, 0, 0])
  expect((await lit(5, 39)).shown).toEqual([0, 0, 1, 0, 0])
})

// Opens a deep link, waits for its step index and for the step to finish playing.
async function at(hash: string, index: number): Promise<Page> {
  const page = await open(hash)
  await page.waitForFunction((i) => window.klappe.stepper.index === i, index)
  await settle(page)
  return page
}
const opacities = (page: Page, sel: string) =>
  page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => +(+getComputedStyle(e).opacity).toFixed(2)), sel)
const shown = (page: Page, sel: string) =>
  page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => getComputedStyle(e).visibility === 'visible'), sel)

test('highlight lights one bar and its value, dims the rest, and highlight(null) clears it', async () => {
  const lit = await at('/a/lit-bar/4', 43)
  expect(await opacities(lit, '[data-scene="lit-bar"] [data-k-chart="bar"] [data-bar]')).toEqual([0.35, 0.35, 1, 0.35])
  expect(await opacities(lit, '[data-scene="lit-bar"] [data-k-chart="bar"] [data-k-text]')).toEqual([0.35, 0.35, 1, 0.35])
  await lit.close()
  const clear = await at('/a/lit-bar/5', 44)
  expect(await opacities(clear, '[data-scene="lit-bar"] [data-k-chart="bar"] [data-bar]')).toEqual([1, 1, 1, 1])
  expect(await opacities(clear, '[data-scene="lit-bar"] [data-k-chart="bar"] [data-k-text]')).toEqual([1, 1, 1, 1])
  await clear.close()
})

test('series(i) draws one line with its values; highlight(i) on a line chart lights a series', async () => {
  const one = await at('/a/series/2', 46)
  // Values in series order: north's five, then south's.
  expect(await shown(one, '[data-scene="series"] [data-k-chart="line"] [data-k-text]')).toEqual([true, true, true, true, true, false, false, false, false, false])
  await one.close()
  const lit = await at('/a/series/4', 48)
  expect(await opacities(lit, '[data-scene="series"] [data-k-chart="line"] path[stroke-width="5"]')).toEqual([0.35, 1])
  await lit.close()
})

test('slice(i) draws one slice, shows its legend values and counts the total so far', async () => {
  const page = await at('/a/slice/3', 51)
  const r = await page.evaluate(() => {
    const g = document.querySelector('[data-scene="slice"] [data-k-chart="donut"]')!
    const texts = [...g.querySelectorAll('[data-k-text]')]
    return {
      drawn: [...g.querySelectorAll<SVGCircleElement>('circle')].map((a) => Math.abs(parseFloat(getComputedStyle(a).strokeDashoffset)) < 1e-3),
      total: texts[0].textContent,
      legend: texts.slice(1).map((e) => getComputedStyle(e).visibility === 'visible'),
    }
  })
  expect(r.drawn).toEqual([true, true, false, false])
  expect(r.total).toBe('70')
  expect(r.legend).toEqual([true, true, true, true, false, false, false, false])
  await page.close()
})

test('bar(i) grows one stack of a stacked chart; highlight(i) lights that stack', async () => {
  const heights = (page: Page) =>
    page.evaluate(() => [...document.querySelectorAll('[data-scene="stack-steps"] [data-k-chart="stacked"] [data-bar]')].map((b) => b.getBoundingClientRect().height > 1))
  const grown = await at('/a/stack-steps/2', 55)
  // Bars are series by series: category 1 is bars 1, 5 and 9.
  expect(await heights(grown)).toEqual([false, true, false, false, false, true, false, false, false, true, false, false])
  await grown.close()
  const lit = await at('/a/stack-steps/3', 56)
  expect(await opacities(lit, '[data-scene="stack-steps"] [data-k-chart="stacked"] [data-bar]')).toEqual([0.35, 1, 0.35, 0.35, 0.35, 1, 0.35, 0.35, 0.35, 1, 0.35, 0.35])
  await lit.close()
})

test('bar(i) on a funnel grows one stage with its value and its conversion', async () => {
  const page = await at('/a/funnel-steps/3', 59)
  const r = await page.evaluate(() => {
    const g = document.querySelector('[data-scene="funnel-steps"] [data-k-chart="funnel"]')!
    return {
      bars: [...g.querySelectorAll('[data-bar]')].map((b) => b.getBoundingClientRect().width > 1),
      values: [...g.querySelectorAll('[data-k-text]')].filter((e) => getComputedStyle(e).visibility === 'visible').map((e) => e.textContent),
    }
  })
  expect(r.bars).toEqual([true, true, false, false, false])
  expect(r.values).toEqual(['1,000', '400', '40 %'])
  await page.close()
})

test('a reference line spans the plot at its value, dashed, its label beside it, both with the axes', async () => {
  const line = async (hash: string, index: number, scene: string) => {
    const page = await at(hash, index)
    const r = await page.evaluate((s) => {
      const g = document.querySelector(`[data-scene="${s}"] [data-k-chart]`)!
      const ref = g.querySelector<SVGLineElement>('[data-k-ref]')!
      const tick = (v: string) => [...g.querySelectorAll('.tick')].find((t) => t.textContent === v)
      const label = [...g.querySelectorAll('text')].find((t) => t.textContent === ref.dataset.kRef)!
      return {
        dashed: getComputedStyle(ref).strokeDasharray !== 'none',
        shown: getComputedStyle(ref).visibility === 'visible' && getComputedStyle(label).visibility === 'visible',
        at: ['x1', 'y1', 'x2', 'y2'].map((a) => +ref.getAttribute(a)!),
        // The axis tick at the line's value, as [x, y] (d3 may shift a tick half a pixel).
        tick: (tick('300') ?? tick('2024'))?.getAttribute('transform')?.match(/[-\d.]+/g)?.map(Number),
      }
    }, scene)
    await page.close()
    return r
  }
  const goal = await line('/a/target/1', 60, 'target')
  expect(goal.dashed).toBe(true)
  expect(goal.shown).toBe(true)
  // Horizontal, at the y of the axis's 300 tick (the axis reaches it).
  expect(goal.at[1]).toBe(goal.at[3])
  expect(Math.abs(goal.tick![1] - goal.at[1])).toBeLessThanOrEqual(1)
  const today = await line('/a/today/1', 63, 'today')
  expect(today.at[0]).toBe(today.at[2])
  expect(Math.abs(today.tick![0] - today.at[0])).toBeLessThanOrEqual(1)
  expect(today.shown).toBe(true)
})
