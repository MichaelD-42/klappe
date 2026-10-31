import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

async function open(query: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?${query}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name)

const sizes = [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
]

test('a theme that sets one token walks ok and keeps calm for the rest', async () => {
  for (const vp of sizes) {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=theme-partial`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  }
  const page = await open('fixture=theme-partial')
  expect(await token(page, '--k-accent')).toBe('#ff9f1c')
  expect(await token(page, '--k-bg')).toBe('#0f1b2d')
  await page.close()
})

test('a theme with poor contrast is a deck problem', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=theme-lowcontrast`)
  expect(r.problems).toContain('theme: --k-fg on --k-bg contrast 1.9 < 4.5')
  expect(r.problems.every((p) => /^theme: --k-(?:fg|muted|accent) on --k-(?:bg|surface) contrast [\d.]+ < [\d.]+$/.test(p))).toBe(true)
})

for (const vp of sizes)
  test(`theme-bold walks green at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=theme-bold`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  })

test('?theme=bold switches a deck to the bold palette', async () => {
  const page = await open('fixture=two-scenes&theme=bold')
  expect(await token(page, '--k-bg')).toBe('#1b0b33')
  await page.close()
  const calm = await open('fixture=two-scenes')
  expect(await token(calm, '--k-bg')).toBe('#0f1b2d')
  await calm.close()
})

test('an oklch colour loads without errors and reports a measure or a problem', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=theme-oklch`)
  expect(r.errors).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.problems.every((p) => /^theme: --k-[\w-]+ (?:on --k-\w+ contrast [\d.]+ < [\d.]+|not a readable colour \(.+\))$/.test(p))).toBe(true)
})

test('the problems overlay stays readable under a low-contrast theme', async () => {
  const page = await open('fixture=theme-lowcontrast')
  const ratio = await page.evaluate(() => {
    const el = document.querySelector('.k-problems') as HTMLElement
    const n = (c: string) => c.match(/[\d.]+/g)!.slice(0, 3).map(Number)
    const L = (c: string) => {
      const [r, g, b] = n(c).map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const s = getComputedStyle(el)
    const [a, b] = [L(s.color), L(s.backgroundColor)].sort((x, y) => y - x)
    return (a + 0.05) / (b + 0.05)
  })
  expect(ratio).toBeGreaterThanOrEqual(4.5)
  await page.close()
})

// Effects measure text while they build, so the theme's fonts must be loaded before the first scene is in the page.
test('the theme fonts are loaded before the deck renders', async () => {
  for (const [theme, font] of [
    ['calm', 'Inter Variable'],
    ['bold', 'Space Grotesk Variable'],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
    await page.addInitScript((font) => {
      new MutationObserver((_, obs) => {
        if (!document.querySelector('.k-worlds > *')) return
        obs.disconnect()
        // fonts.check() is true for a font with no face at all, so look for a loaded face by name.
        const loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/["']/g, ''))
        ;(window as any).fontsAtRender = [font, 'JetBrains Mono Variable'].map((f) => loaded.includes(f))
      }).observe(document, { childList: true, subtree: true })
    }, font)
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-code&theme=${theme}`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    expect(await page.evaluate(() => (window as any).fontsAtRender)).toEqual([true, true])
    await page.close()
  }
})

// The type scale at 1.5x the defaults (88, 44, 28): every role's text grows with its token.
test('a theme that sets the type scale sizes the Markdown scene, text, a fitted list and a big number', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=type-scale`)
  expect(r.errors).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.problems).toEqual([])
  const page = await open('fixture=type-scale#/a/coded/1')
  const px = await page.evaluate(() => {
    const size = (e: Element | null | undefined) => parseFloat(getComputedStyle(e!).fontSize)
    const md = document.querySelector('div[data-scene="md"]')!
    const coded = document.querySelector('div[data-scene="coded"]')!
    const all = [...coded.querySelectorAll<HTMLElement>('div, span')]
    return {
      title: size(md.querySelector('h2')),
      body: size(md.querySelector('p, li')),
      text: size(all.find((e) => e.textContent === 'Body text')),
      list: size(all.find((e) => e.style.top === '320px' && e.style.left === '160px')),
      number: size(all.find((e) => e.tagName === 'SPAN' && e.textContent === '42')),
    }
  })
  expect(px).toEqual({ title: 132, body: 66, text: 66, list: 60, number: 168 })
  await page.close()
})

// Radius 24 (2x), stroke 8 (2x), gap 32 (4x): a 16 px corner is 32, a 2 px stroke is 4, a 20 px row gap is 80 and
// the 8 px gap between pyramid layers is 32.
test('a theme that sets --k-radius, --k-stroke and --k-gap changes a box, a stroke and the gaps', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=layout-tokens`)
  expect(r.errors).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.problems).toEqual([])
  const page = await open('fixture=layout-tokens#/a/coded/1')
  const px = await page.evaluate(() => {
    const scene = document.querySelector('div[data-scene="coded"]')!
    const svg = document.querySelector('g[data-scene="coded"]')!
    const box = (id: string) => svg.querySelector<SVGGraphicsElement>(`[data-k-pyramid-layer="${id}"] polygon`)!
    const [low, high] = [box('a').getBBox(), box('b').getBBox()]
    const list = [...scene.querySelectorAll<HTMLElement>('div')].find((e) => e.style.top === '600px' && e.style.left === '160px')!
    return {
      radius: getComputedStyle([...scene.querySelectorAll<HTMLElement>('div')].find((e) => e.style.borderRadius.includes('--k-radius') && e.style.background.includes('--k-surface'))!).borderRadius,
      stroke: getComputedStyle(box('a')).strokeWidth,
      layerGap: low.y - (high.y + high.height),
      rowGap: getComputedStyle(list).rowGap,
    }
  })
  expect(px).toEqual({ radius: '32px', stroke: '4px', layerGap: 32, rowGap: '80px' })
  await page.close()
})

// A section.ts `tokens` override reaches the section's scenes, its stage background and the JS that reads tokens.
test('a section that overrides tokens is inverted edge to edge; the others keep the deck theme', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=section-rhythm`)
  expect(r.errors).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.problems).toEqual([])
  const page = await open('fixture=section-rhythm#/dark/first/1')
  const read = (scene: string) =>
    page.evaluate((id) => {
      const d = document.querySelector(`div[data-scene="${id}"]`)!
      const g = document.querySelector(`g[data-scene="${id}"]`)!
      const pin = document.querySelector<HTMLElement>(`[data-k-background]`)
      return {
        bg: getComputedStyle(d).getPropertyValue('--k-bg').trim(),
        svgBg: getComputedStyle(g).getPropertyValue('--k-bg').trim(),
        color: getComputedStyle(d).color,
        body: getComputedStyle(d).getPropertyValue('--k-size-body').trim(),
        pin: pin ? getComputedStyle(pin).backgroundColor : '',
      }
    }, scene)
  expect((await read('first')).bg).toBe('#0f1b2d')
  expect((await read('second')).bg).toBe('#ffffff')
  expect((await read('second')).svgBg).toBe('#ffffff')
  expect((await read('second')).color).toBe('rgb(15, 27, 45)')
  expect((await read('third')).bg).toBe('#0f1b2d')
  await page.close()
  // A deep link into the second section shows its background: the visible pinned layer is white, the stage behind is not.
  const deep = await open('fixture=section-rhythm#/light/second/1')
  const shown = await deep.evaluate(() => {
    const pins = [...document.querySelectorAll<HTMLElement>('[data-k-background]')]
    const on = pins.filter((p) => Number(getComputedStyle(p).opacity) > 0.99 && p.closest('.k-canvas') && Number(getComputedStyle(p.closest('.k-canvas')!).opacity) > 0.99)
    return on.map((p) => getComputedStyle(p).backgroundColor)
  })
  expect(shown).toEqual(['rgb(255, 255, 255)'])
  await deep.close()
})

test('a section token override is measured: a light background with calm text is a deck problem naming the section', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=section-rhythm-contrast`)
  expect(r.problems).toContainEqual(expect.stringMatching(/^theme: section light: --k-fg on --k-bg contrast 1\.\d < 4\.5$/))
  expect(r.problems.every((p) => p.startsWith('theme: section light: '))).toBe(true)
})

test('JS-resolved tokens follow the section: --k-size-body reaches typeSize at build time', async () => {
  const page = await open('fixture=section-rhythm#/light/second/1')
  const size = (id: string) => page.evaluate((i) => Number(document.querySelector(`div[data-scene="${i}"]`)!.getAttribute('data-body')), id)
  // --k-size-body 60px over the default 44px, on the second section only.
  expect(await size('first')).toBe(44)
  expect(await size('second')).toBeCloseTo(60, 5)
  await page.close()
})
