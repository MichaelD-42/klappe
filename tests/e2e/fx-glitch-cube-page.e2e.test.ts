import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

const open = async (query = '') => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-glitch-cube-page${query}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

for (const reduced of [false, true])
  for (const vp of [
    { w: 1920, h: 1080 },
    { w: 1366, h: 768 },
    { w: 1024, h: 768 },
  ])
    test(`walk passes across glitch, cube and page turn at ${vp.w}x${vp.h}${reduced ? ', reduced motion' : ''}`, async () => {
      const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-glitch-cube-page${reduced ? '&reducedmotion=1' : ''}`, vp)
      expect(r.errors).toEqual([])
      expect(r.problems).toEqual([])
      expect(r.checks.filter((c) => !c.ok)).toEqual([])
      expect(r.ok).toBe(true)
    })

// Each transition plays forward, then leaves no clip, offset, filter, 3D pose or stage colour behind,
// also when the next press interrupts it halfway.
for (const interrupted of [false, true])
  test(`glitch, cube and page turn play and leave nothing behind${interrupted ? ' when interrupted' : ''}`, async () => {
    const page = await open('&reducedmotion=0')
    const r = await page.evaluate(async (interrupted) => {
      const k = window.klappe
      const kinds: string[] = []
      k.stepper.on('transition', (e: { kind: string }) => kinds.push(e.kind))
      const worlds = k.canvases[0].el.parentElement as HTMLElement
      const left: string[] = []
      for (let i = 0; i < 3; i++) {
        while (k.stepper.running.length) await new Promise(requestAnimationFrame)
        await k.stepper.next() // to the bullet
        const move = k.stepper.next() // across the transition
        if (interrupted) {
          for (let f = 0; f < 10; f++) await new Promise(requestAnimationFrame)
          k.stepper.next() // finishes the move at once, then steps on
        }
        await move
        for (const e of [worlds, worlds.parentElement!, ...k.canvases.map((c: { el: HTMLElement }) => c.el)])
          for (const p of ['clip-path', 'translate', 'filter', 'transform', 'perspective', 'background-color', 'z-index', 'overflow'])
            // The stage's own transform fits it to the window.
            if (e.style.getPropertyValue(p) && !(p === 'transform' && e.classList.contains('k-stage'))) left.push(`${e.className} ${p}: ${e.style.getPropertyValue(p)}`)
      }
      while (k.stepper.running.length) await new Promise(requestAnimationFrame)
      return { kinds, left, shown: k.canvases.map((c: { el: HTMLElement }) => getComputedStyle(c.el).visibility) }
    }, interrupted)
    expect(r.kinds).toEqual(['glitch', 'cube', 'pageTurn'])
    expect(r.left).toEqual([])
    expect(r.shown).toEqual(['hidden', 'hidden', 'hidden', 'visible'])
    await page.close()
  }, 60_000)

// The glitch flashes and the cube and page turn swing the whole frame: reduced motion fades instead.
test('reduced motion plays a fade for glitch, cube and page turn', async () => {
  const kinds = async (flag: string) => {
    const page = await open(`&reducedmotion=${flag}`)
    const k = await page.evaluate(() => window.klappe.canvases.flatMap((c: any) => Object.values(c.entries).map((e: any) => e.kind)))
    await page.close()
    return k as string[]
  }
  expect(await kinds('0')).toEqual(expect.arrayContaining(['glitch', 'cube', 'pageTurn']))
  expect((await kinds('1')).filter((k) => ['glitch', 'cube', 'pageTurn'].includes(k))).toEqual([])
}, 60_000)
