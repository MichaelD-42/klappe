import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

const BAD = 'text: color "red" is not a --k-* token name'

// Reduced motion too: show and hide are plain fades either way.
for (const [vp, q] of [
  [{ w: 1920, h: 1080 }, ''],
  [{ w: 1366, h: 768 }, ''],
  [{ w: 1920, h: 1080 }, '&reducedmotion=1'],
] as const)
  test(`walk: play equals seek at ${vp.w}x${vp.h}${q}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-basics${q}`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([BAD])
  }, 120_000)

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-basics${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

// Each element of a scene: its text, visibility, colour, and its offset from the scene's top-left in scene units.
const read = (page: Page, scene: string) =>
  page.evaluate((scene) => {
    const root = document.querySelector<HTMLElement>(`div[data-scene="${scene}"]`)!
    const r = root.getBoundingClientRect()
    const k = r.width / root.offsetWidth
    const probe = root.appendChild(document.createElement('i'))
    const token = (t: string) => ((probe.style.color = `var(${t})`), getComputedStyle(probe).color)
    const tokens = { fg: token('--k-fg'), muted: token('--k-muted'), accent: token('--k-accent') }
    probe.remove()
    const els = [...root.querySelectorAll<HTMLElement>('h2, div')].map((e) => {
      const b = e.getBoundingClientRect()
      const s = getComputedStyle(e)
      return { tag: e.tagName, text: e.textContent, vis: s.visibility, o: s.opacity, color: s.color, weight: s.fontWeight, x: Math.round((b.left - r.left) / k), y: Math.round((b.top - r.top) / k) }
    })
    return { els, tokens }
  }, scene)

test('the title comes from scene.md and sits where a Markdown scene puts its h2; text boxes sit at x, y in their token colour', async () => {
  const page = await open('#/a/boxes/2')
  const { els, tokens } = await read(page, 'boxes')
  const [h, a, b, c] = els
  expect(h).toMatchObject({ tag: 'H2', text: 'Title from scene.md', vis: 'visible', o: '1', x: 160, y: 140 })
  expect(a).toMatchObject({ x: 160, y: 360, color: tokens.fg, vis: 'visible' })
  expect(b).toMatchObject({ x: 160, y: 480, color: tokens.muted, vis: 'visible' })
  expect(c).toMatchObject({ x: 960, y: 480, color: tokens.accent, weight: '700', vis: 'visible' })
  await page.close()
}, 60_000)

test('before their step the boxes are hidden; hide hides, a later show brings the box back', async () => {
  const page = await open('#/a/boxes/1')
  const at1 = (await read(page, 'boxes')).els
  expect(at1.map((e) => e.vis)).toEqual(['visible', 'visible', 'hidden', 'hidden'])
  await page.close()
  const p3 = await open('#/a/boxes/3')
  expect((await read(p3, 'boxes')).els[1].vis).toBe('hidden')
  await p3.close()
  const p4 = await open('#/a/boxes/4')
  expect((await read(p4, 'boxes')).els[1]).toMatchObject({ vis: 'visible', o: '1' })
  await p4.close()
}, 60_000)

test('a colour that is not a token falls back to --k-fg; a given title wins over scene.md', async () => {
  const page = await open('#/a/bad/1')
  const { els, tokens } = await read(page, 'bad')
  expect(els[0].text).toBe('Given title')
  expect(els[1]).toMatchObject({ text: 'Not a token', color: tokens.fg })
  await page.close()
}, 60_000)
