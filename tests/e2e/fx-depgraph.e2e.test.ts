import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-depgraph&instant=1#${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(300)
  return page
}
// The ringed nodes, the dimmed nodes and the lit arrows.
const state = (page: Page) =>
  page.evaluate(() => {
    const nodes = [...document.querySelectorAll<HTMLElement>('div[data-scene="graph"] [data-k-dep-node]')]
    const links = [...document.querySelectorAll<SVGGElement>('g[data-scene="graph"] [data-k-dep-link]')]
    return {
      lit: nodes.filter((n) => +getComputedStyle(n.lastElementChild!).opacity > 0.9).map((n) => n.dataset.kDepNode).sort(),
      dim: nodes.filter((n) => +getComputedStyle(n).opacity < 0.5).map((n) => n.dataset.kDepNode).sort(),
      hot: links.filter((g) => +getComputedStyle(g.children[2]).opacity > 0.9).map((g) => g.dataset.kDepLink).sort(),
    }
  })

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: the dependency graph plays as it seeks at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-depgraph`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([
      'sections/10-a/20-bad/scene.ts: depGraph: a cycle through "web", "mobile"; a dependency graph has none',
      'sections/10-a/20-bad/scene.ts step 2: depGraph: trace of unknown node "nope"',
    ])
  })

test('trace lights what a node depends on, up its blast radius; the rest dims; clear lights nothing', async () => {
  const at = async (step: number) => {
    const page = await open(`/a/graph/${step}`)
    const s = await state(page)
    await page.close()
    return s
  }
  expect(await at(1)).toEqual({ lit: [], dim: [], hot: [] })
  expect(await at(2)).toEqual({ lit: ['api', 'auth', 'cache', 'db'], dim: ['mobile', 'web'], hot: ['api>auth', 'api>cache', 'api>db'] })
  expect(await at(3)).toEqual({ lit: ['api', 'auth', 'db', 'mobile', 'web'], dim: ['cache'], hot: ['api>db', 'auth>db', 'mobile>api', 'web>api'] })
  expect(await at(4)).toEqual({ lit: [], dim: [], hot: [] })
}, 90_000)
