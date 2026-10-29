import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

// The too-thin line is the fixture's only problem.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-options`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([
      'sections/10-a/40-lines/scene.ts: shape: width 1 is under the 2 px floor',
      'sections/10-a/88-four-points/scene.ts: likert: row 2 needs 4 counts of 0 or more, got [1, 1, 1, 1, 1]',
      'sections/10-a/92-clip-vimeo/scene.ts: video: a Vimeo player cannot stop at end; it plays on from start',
    ])
  }, 120_000)

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-options${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  return page
}

test('spotlight shape "circle": a round hole round the whole target', async () => {
  const page = await open('#/a/round/1')
  const r = await page.evaluate(() => {
    const hole = document.querySelector<HTMLElement>('[data-scene="round"] [data-k-spotlight-hole]')!
    const [h, b] = [hole.getBoundingClientRect(), document.querySelector('[data-scene="round"] [data-box]')!.getBoundingClientRect()]
    const [cx, cy, rad] = [h.x + h.width / 2, h.y + h.height / 2, h.width / 2]
    const corners = [[b.left, b.top], [b.right, b.top], [b.left, b.bottom], [b.right, b.bottom]]
    return { round: getComputedStyle(hole).borderRadius === '50%', square: Math.abs(h.width - h.height) < 1, holds: corners.every(([x, y]) => Math.hypot(x - cx, y - cy) < rad) }
  })
  expect(r).toEqual({ round: true, square: true, holds: true })
  await page.close()
}, 60_000)

test('wipe direction "vertical": the after picture comes in from the top, the divider runs across', async () => {
  const page = await open('#/a/vertical/2')
  const r = await page.evaluate(() => {
    const d = document.querySelector<HTMLElement>('[data-scene="vertical"] [data-k-wipe-divider]')!.getBoundingClientRect()
    const clipped = [...document.querySelectorAll<HTMLElement>('[data-scene="vertical"] [data-k-wipe] > div')].find((e) => e.style.clipPath)!
    return { clip: clipped.style.clipPath, across: d.width > 1900 && d.height < 6, y: Math.round(d.y + d.height / 2) }
  })
  expect(r).toEqual({ clip: 'inset(0% 0% 50%)', across: true, y: 540 })
  await page.close()
}, 60_000)

test('loupe to(x, y, { zoom }): that stop enlarges by its own zoom; the next falls back to the base', async () => {
  const scale = async (step: number) => {
    const page = await open(`#/a/zoom/${step}`)
    const s = await page.evaluate(() => document.querySelector('[data-scene="zoom"] [data-k-loupe-copy]')!.getBoundingClientRect().width / 1600)
    await page.close()
    return Math.round(s * 10) / 10
  }
  expect(await scale(1)).toBe(2)
  expect(await scale(2)).toBe(4)
  expect(await scale(3)).toBe(2)
}, 60_000)

test('shape and arrow: dash draws dashed, width sets the stroke', async () => {
  const page = await open('#/a/lines/1')
  const r = await page.evaluate(() =>
    [...document.querySelectorAll<SVGGElement>('[data-scene="lines"] [data-k-shape]')].map((g) => ({
      width: getComputedStyle(g).strokeWidth,
      dashed: getComputedStyle(g.querySelector('rect, line, path')!).strokeDasharray !== 'none',
    })),
  )
  expect(r).toEqual([
    { width: '6px', dashed: true },
    { width: '4px', dashed: true },
    { width: '2px', dashed: false },
    { width: '4px', dashed: false },
  ])
  await page.close()
}, 60_000)

test('shape fill and radius: a rounded box filled in --k-surface once it has drawn', async () => {
  const page = await open('#/a/lines/1')
  await page.waitForTimeout(1500)
  const r = await page.evaluate(() => {
    const el = [...document.querySelectorAll('[data-scene="lines"] [data-k-shape] rect')].pop()!
    const s = getComputedStyle(el)
    const probe = document.body.appendChild(document.createElement('div'))
    probe.style.color = 'var(--k-surface)'
    const surface = getComputedStyle(probe).color
    probe.remove()
    return { rx: el.getAttribute('rx'), fill: s.fill, opacity: s.fillOpacity, surface }
  })
  expect(r.rx).toBe('24')
  expect(r.fill).toBe(r.surface)
  expect(r.opacity).toBe('1')
  await page.close()
}, 60_000)

test('pulse takes a colour token', async () => {
  const page = await open('#/a/warn/1')
  const r = await page.evaluate(() => document.querySelector<HTMLElement>('[data-scene="warn"] [data-k-pulse]')!.style.borderColor)
  expect(r).toBe('var(--k-warn)')
  await page.close()
}, 60_000)

// compact: when A leaves, B and C move up into the slots A and B held.
for (const [scene, sel, last] of [['compact-matrix', '[data-k-matrix-item="ID"]', 5], ['compact-notes', '[data-k-sticky="ID"]', 3]] as const)
  test(`${scene}: the items after one that leaves close its gap`, async () => {
    const at = async (step: number) => {
      const page = await open(`#/a/${scene}/${step}`)
      await page.waitForTimeout(1500)
      const r = await page.evaluate((s) => Object.fromEntries(['a', 'b', 'c'].map((id) => {
        const b = document.querySelector(s.replace('ID', id))!.getBoundingClientRect()
        return [id, [Math.round(b.x), Math.round(b.y)]]
      })), sel)
      await page.close()
      return r
    }
    const before = await at(last - 1)
    const after = await at(last)
    expect(after.b).toEqual(before.a)
    expect(after.c).toEqual(before.b)
  }, 60_000)

test('compareTable "~": a partly mark in --k-warn, spoken "partly"', async () => {
  const page = await open('#/a/partial/1')
  const r = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-scene="partial"] [role="img"]')].map((m) => [m.getAttribute('aria-label'), m.style.color]),
  )
  expect(r).toEqual([['partly', 'var(--k-warn)'], ['yes', 'var(--k-ok)'], ['no', 'var(--k-bad)']])
  await page.close()
}, 60_000)

test('video start and end: a fragment on a local file, start and end on YouTube, #t on Vimeo', async () => {
  const src = async (scene: string) => {
    const page = await open(`#/a/${scene}/1`)
    await page.route(/youtube|vimeo/, (r) => r.fulfill({ body: '<body>player</body>', contentType: 'text/html' }))
    const s = await page.evaluate((n) => document.querySelector(`[data-scene="${n}"] [data-k-video]`)!.getAttribute('src'), scene)
    await page.close()
    return s
  }
  expect(await src('clip-file')).toBe('data:video/webm;base64,#t=1.5,4')
  expect(await src('clip-youtube')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?start=42&end=71')
  expect(await src('clip-vimeo')).toBe('https://player.vimeo.com/video/76979871#t=42s')
}, 60_000)

test('gauge bands: one arc per zone under the dial, in its tone, from where the last one ended', async () => {
  const page = await open('#/a/bands/1')
  const r = await page.evaluate(() =>
    [...document.querySelectorAll<SVGPathElement>('[data-scene="bands"] [data-k-gauge-band]')].map((b) => [b.dataset.kGaugeBand, b.style.stroke, b.style.strokeDasharray, b.style.strokeDashoffset]),
  )
  expect(r).toEqual([
    ['ok', 'color-mix(in srgb, var(--k-ok) 60%, var(--k-bg))', '0.7, 2', '0'],
    ['warn', 'color-mix(in srgb, var(--k-warn) 60%, var(--k-bg))', '0.2, 2', '-0.7'],
    ['bad', 'color-mix(in srgb, var(--k-bad) 60%, var(--k-bg))', '0.1, 2', '-0.9'],
  ])
  await page.close()
}, 60_000)

test('roadmap status: a milestone settles to its tone, with an icon that names it', async () => {
  const page = await open('#/a/status/2')
  const r = await page.evaluate(() => {
    const root = document
    const probe = document.body.appendChild(document.createElement('i'))
    const token = (t: string) => ((probe.style.color = `var(${t})`), getComputedStyle(probe).color)
    const names: Record<string, string> = { [token('--k-ok')]: 'ok', [token('--k-warn')]: 'warn', [token('--k-bad')]: 'bad', [token('--k-line')]: 'line' }
    const dots = [...root.querySelectorAll<SVGCircleElement>('g[data-scene="status"] circle')].map((c) => names[getComputedStyle(c).fill] ?? getComputedStyle(c).fill)
    const icons = ['a', 'b', 'c', 'd'].map((id) => root.querySelector(`div[data-scene="status"] [data-k-roadmap-milestone="${id}"] [role="img"]`)?.getAttribute('aria-label') ?? null)
    return { dots, icons }
  })
  expect(r).toEqual({ dots: ['ok', 'warn', 'bad', 'line'], icons: ['done', 'at risk', 'late', null] })
  await page.close()
}, 60_000)

test('mindMap light(i): that branch stays, the others dim; light(null) brings all back', async () => {
  const at = async (step: number) => {
    const page = await open(`#/a/mind-light/${step}`)
    const r = await page.evaluate(() =>
      [0, 1, 2].map((i) => [...document.querySelectorAll<SVGGElement>(`[data-k-mind-light="${i}"]`)].map((g) => Number(getComputedStyle(g).opacity))),
    )
    await page.close()
    return r
  }
  expect(await at(1)).toEqual([[1], [1], [1]])
  expect(await at(2)).toEqual([[1], [0.35], [0.35]])
  expect(await at(3)).toEqual([[0.35], [0.35], [1]])
  expect(await at(4)).toEqual([[1], [1], [1]])
}, 90_000)

test('sequence highlight(i): an earlier message takes the accent again; null lights none', async () => {
  const at = async (step: number) => {
    const page = await open(`#/a/seq-light/${step}`)
    const r = await page.evaluate(() => {
      const probe = document.body.appendChild(document.createElement('i'))
      const token = (t: string) => ((probe.style.color = `var(${t})`), getComputedStyle(probe).color)
      const names: Record<string, string> = { [token('--k-accent')]: 'accent', [token('--k-line')]: 'line' }
      return [...document.querySelectorAll<SVGPathElement>('g[data-scene="seq-light"] path[style*="stroke-width: 4"]')].map((p) => names[getComputedStyle(p).stroke])
    })
    await page.close()
    return r
  }
  expect(await at(1)).toEqual(['line', 'line', 'accent'])
  expect(await at(2)).toEqual(['accent', 'line', 'line'])
  expect(await at(3)).toEqual(['line', 'line', 'line'])
}, 90_000)

test('swimlanes tasks(ids): the lanes and those tasks, then each link once both its ends show; show brings the rest', async () => {
  const at = async (step: number) => {
    const page = await open(`#/a/lane-tasks/${step}`)
    const r = await page.evaluate(() => {
      const vis = (e: Element) => getComputedStyle(e).visibility !== 'hidden' && +getComputedStyle(e).opacity > 0.5
      const tasks = ['order', 'pack', 'ship'].filter((id) => vis(document.querySelector(`[data-k-swimlane-task="${id}"]`)!))
      const links = [...document.querySelectorAll('g[data-scene="lane-tasks"] path[style*="stroke-width: 4"]')].filter(vis).length
      return { tasks, links }
    })
    await page.close()
    return r
  }
  expect(await at(1)).toEqual({ tasks: ['order'], links: 0 })
  expect(await at(2)).toEqual({ tasks: ['order', 'pack'], links: 1 })
  expect(await at(3)).toEqual({ tasks: ['order', 'pack', 'ship'], links: 2 })
}, 90_000)

test('counter to(value): counts on from where the steps before left it', async () => {
  const at = async (step: number) => {
    const page = await open(`#/a/count-on/${step}`)
    const r = await page.evaluate(() => document.querySelector('div[data-scene="count-on"] [data-k-text]')!.textContent)
    await page.close()
    return r
  }
  expect([await at(1), await at(2), await at(3)]).toEqual(['120', '80', '12'])
}, 90_000)

// Terms count in source order: a fraction's numerator is term 0, though KaTeX puts the denominator first in the DOM.
test('formula light(i): a shown term turns --k-accent, the one before goes back; null lights none', async () => {
  const at = async (step: number) => {
    const page = await open(`#/a/term-light/${step}`)
    const r = await page.evaluate(() => {
      const probe = document.body.appendChild(document.createElement('i'))
      const token = (t: string) => ((probe.style.color = `var(${t})`), getComputedStyle(probe).color)
      const names: Record<string, string> = { [token('--k-accent')]: 'accent', [token('--k-fg')]: 'fg' }
      return [...document.querySelectorAll('[data-scene="term-light"] .katex-html .k-ft')].filter((t) => names[getComputedStyle(t).color] === 'accent').map((t) => t.textContent)
    })
    await page.close()
    return r
  }
  expect(await at(1)).toEqual([])
  expect(await at(2)).toEqual(['c2'])
  expect(await at(3)).toEqual(['m'])
  expect(await at(4)).toEqual([])
}, 90_000)

test('spotlight on([a, b]): a hole round each target, both bright, the rest dimmed', async () => {
  const at = async (step: number) => {
    const page = await open(`#/a/two-holes/${step}`)
    const r = await page.evaluate(() => {
      const boxes = [...document.querySelectorAll<HTMLElement>('div[data-scene="two-holes"] [data-box]')].map((b) => b.getBoundingClientRect())
      const holes = [...document.querySelectorAll<HTMLElement>('div[data-scene="two-holes"] [data-k-spotlight-hole]')]
        .filter((h) => h.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
        .map((h) => h.getBoundingClientRect())
      return boxes.map((b) => holes.some((h) => h.x < b.x && h.y < b.y && h.right > b.right && h.bottom > b.bottom))
    })
    // Bright inside each hole: a pixel in the box is lighter than one in the dim between them.
    const px = async (x: number, y: number) => {
      const png = await page.screenshot({ clip: { x, y, width: 2, height: 2 } })
      return page.evaluate(async (b64) => {
        const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
        const c = new OffscreenCanvas(img.width, img.height).getContext('2d')!
        c.drawImage(img, 0, 0)
        const [r, g, b] = c.getImageData(0, 0, 1, 1).data
        return r + g + b
      }, png.toString('base64'))
    }
    const lit = step === 2 ? [await px(170, 310), await px(1370, 610), await px(900, 150)] : []
    await page.close()
    return { framed: r, lit }
  }
  expect((await at(1)).framed).toEqual([true, false])
  const both = await at(2)
  expect(both.framed).toEqual([true, true])
  expect(both.lit[0]).toBeGreaterThan(both.lit[2])
  expect(both.lit[1]).toBeGreaterThan(both.lit[2])
  expect((await at(3)).framed).toEqual([false, true])
}, 90_000)

test('likert with a 4-point scale: four colours from --k-bad to --k-ok, agree is the top two', async () => {
  const page = await open('#/a/four-points/1')
  const r = await page.evaluate(() => {
    const row = document.querySelector<HTMLElement>('div[data-scene="four-points"] [data-k-likert-row="0"]')!
    const parts = [...row.children[1].firstElementChild!.children].map((p) => (p as HTMLElement).style.background)
    return { parts, share: row.lastElementChild!.textContent }
  })
  expect(r).toEqual({
    parts: ['var(--k-bad)', 'color-mix(in srgb, var(--k-bad) 50%, var(--k-bg))', 'color-mix(in srgb, var(--k-ok) 50%, var(--k-bg))', 'var(--k-ok)'],
    share: '70 %',
  })
  await page.close()
}, 60_000)

test('worldMap region share: the fill runs from faint at 0 to strong at 1; a later call moves it', async () => {
  const at = async (step: number) => {
    const page = await open(`#/a/shares/${step}`)
    const r = await page.evaluate(() =>
      Object.fromEntries(['Germany', 'France', 'Spain'].map((c) => [c, document.querySelector<SVGPathElement>(`[data-scene="shares"] [data-k-region="${c}"]`)!.style.fill])),
    )
    await page.close()
    return r
  }
  const mix = (p: number) => `color-mix(in srgb, var(--k-accent) ${p}%, transparent)`
  expect(await at(1)).toEqual({ Germany: mix(85), France: mix(15), Spain: mix(35) })
  expect((await at(2)).France).toBe(mix(50))
}, 90_000)
