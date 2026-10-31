import { chromium } from '@playwright/test'
import { expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

// icons/<name>.svg on Lucide's 24 grid is used by name like a Lucide icon, in the klappe stroke style.
test('an own icon draws by name in icon and iconTile, its paint and scripts stripped; a wrong grid is a problem', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=own-icons`)
  expect(r.errors).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.problems).toEqual(['icons/too-big.svg: viewBox must be 0 0 24 24, as a Lucide icon'])
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(`${inject('BASE_URL')}/?fixture=own-icons#/a/used/1`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    const g = await page.evaluate(() =>
      [...document.querySelectorAll('[data-scene="used"] .k-icon')].map((icon) => {
        const path = icon.querySelector('path[d="M4 12h16"]')
        return {
          shapes: icon.querySelectorAll('path[d="M4 12h16"], circle').length,
          paint: path && [path.getAttribute('fill'), path.getAttribute('class'), /blue/.test(path.getAttribute('style') ?? '')], // drawOn writes its own style
          stroke: icon.querySelector('circle')?.getAttribute('stroke'),
          extra: icon.querySelectorAll('script, title').length,
        }
      }),
    )
    expect(g).toHaveLength(2)
    for (const one of g) expect(one).toEqual({ shapes: 2, paint: [null, null, false], stroke: null, extra: 0 })
    expect(await page.evaluate(() => (window as any).ownIconRan)).toBeUndefined()
  } finally {
    await browser.close()
  }
}, 120_000)
