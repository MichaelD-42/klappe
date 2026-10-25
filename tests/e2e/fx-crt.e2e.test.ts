import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-crt${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk passes on the CRT fixture at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-crt`, vp)
    expect(r.errors).toEqual([])
    expect(r.problems).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.steps).toBe(14)
    expect(r.ok).toBe(true)
  })

// Review focus 1: a deep link to the end of a typing step shows the whole line, as play does.
test('a deep link to a typing step shows its line fully typed', async () => {
  const page = await open('#/a/green/4')
  const lines = await page.evaluate(() => [...document.querySelectorAll('[data-k-text]')].map((e) => e.textContent))
  expect(lines.slice(0, 4)).toEqual(['DEMO-OS v1.0  (c) 1986', '', 'MEMORY TEST: 640K OK', ''])
  await page.close()
})

// Review focus 4: forward plays the CRT transition; back cuts with nothing left over,
// both after the transition ends and when back interrupts it.
for (const interrupted of [false, true])
  test(`back across a CRT transition cuts cleanly${interrupted ? ' when it interrupts the transition' : ''}`, async () => {
    const page = await open('#/a/green/6')
    const r = await page.evaluate(async (interrupted) => {
      const k = window.klappe
      const kinds: string[] = []
      k.stepper.on('transition', (e: { kind: string }) => kinds.push(e.kind))
      const worlds = k.canvases[0].el.parentElement as HTMLElement
      const stage = worlds.parentElement as HTMLElement
      const forward = k.stepper.next()
      if (!interrupted) await forward
      await k.stepper.prev()
      await forward
      return {
        kinds,
        index: k.stepper.index,
        shown: k.canvases.map((c: { el: HTMLElement }) => getComputedStyle(c.el).visibility),
        worlds: worlds.getAttribute('style') ?? '',
        stageBg: stage.style.backgroundColor,
        stageImage: stage.style.backgroundImage,
      }
    }, interrupted)
    expect(r.kinds).toEqual(['crt', 'cut'])
    expect(r.index).toBe(5)
    expect(r.shown).toEqual(['visible', 'hidden', 'hidden'])
    expect(r.worlds).toBe('')
    expect(r.stageBg).toBe('')
    expect(r.stageImage).toBe('')
    await page.close()
  })

// Sixteen lines do not fit at 46 px: the font shrinks, every line shows, and the text stays on the screen.
test('long boot text shrinks to fit the screen', async () => {
  const page = await open('#/b/long/3')
  const r = await page.evaluate(() => {
    const term = document.querySelector('[data-scene="long"] .k-crt-term') as HTMLElement
    const screen = term.parentElement!.getBoundingClientRect()
    const rows = [...term.children].map((e) => e.getBoundingClientRect())
    return {
      size: parseFloat(getComputedStyle(term).fontSize),
      typed: [...term.querySelectorAll('[data-k-text]')].filter((e) => e.textContent!.endsWith('OK')).length,
      inside: rows.every((b) => b.bottom <= screen.bottom && b.right <= screen.right),
    }
  })
  expect(r.size).toBeLessThan(46)
  expect(r.size).toBeGreaterThanOrEqual(20)
  expect(r.typed).toBe(16)
  expect(r.inside).toBe(true)
  await page.close()
})

// A count line needs "label: number K ...": a bad one is a deck problem and still types as plain text.
test('a count line without a number is reported and still types', async () => {
  const page = await open('#/a/boot/1')
  const r = await page.evaluate(async () => {
    const { crt } = await (new Function('p', 'return import(p)') as (p: string) => Promise<any>)('/src/fx/crt.ts') // a string: vitest would rewrite import()
    const html = document.body.appendChild(document.createElement('div'))
    const problems: string[] = []
    const h = crt({ html, rect: { x: 0, y: 0, w: 1920, h: 1080 }, problem: (p: string) => problems.push(p) } as any, {
      lines: [{ text: 'MEMORY TEST: lots', count: true }],
    })
    const Timeline = window.klappe.canvases[0].tl.constructor // the page's own GSAP
    const tl = new Timeline({ paused: true })
    h.powerOn(tl)
    h.type(tl, 0)
    tl.progress(1)
    const text = html.textContent
    html.remove()
    return { problems, text }
  })
  expect(r.problems).toEqual(['crt: count line "MEMORY TEST: lots" needs a label and a number with K, like "MEMORY TEST: 640K OK"'])
  expect(r.text).toContain('MEMORY TEST: lots')
  await page.close()
})

// dim() is a fromTo on the screen's filter: a deep link onto it and a cut back from it agree with play.
test('dim lowers the screen brightness, and a cut back restores it', async () => {
  const page = await open('#/b/amber/4')
  const filter = () => page.evaluate(() => getComputedStyle(document.querySelector('[data-scene="amber"] .k-crt-screen')!).filter)
  expect(await filter()).toBe('brightness(0.3) blur(0px)')
  await page.evaluate(() => window.klappe.stepper.goto(window.klappe.stepper.index - 1, 'cut'))
  expect(await filter()).toBe('brightness(1) blur(0px)')
  await page.close()
})

// Runs in the page with a bare ctx: the handle's root is the .k-retro element, and dims chain from the last level.
test('the crt handle exposes its root, and a second dim starts where the first ended', async () => {
  const page = await open('#/a/green/1')
  // A string, so neither vitest nor tsc rewrites the import: the page loads the module from Vite.
  await page.evaluate("import('/src/fx/crt.ts').then((m) => { window.__crt = m.crt })")
  const r = await page.evaluate(() => {
    const html = document.body.appendChild(document.createElement('div'))
    const h = (window as any).__crt({ html, rect: { x: 0, y: 0, w: 1920, h: 1080 }, problem: () => {} }, { lines: ['A'] })
    const tl = new (window.klappe.canvases[0].tl.constructor as any)({ paused: true })
    h.dim(tl)
    h.dim(tl, { to: 1, at: '+=1' })
    const screen = h.root.querySelector('.k-crt-screen') as HTMLElement
    const at = (t: number) => (tl.seek(t), screen.style.filter)
    const out = { isRoot: h.root === html.lastElementChild && h.root.classList.contains('k-retro'), mid: at(0.6), end: at(tl.duration()), start: at(0) }
    html.remove()
    return out
  })
  expect(r.isRoot).toBe(true)
  expect(r.mid).toBe('brightness(0.3) blur(0px)')
  expect(r.end).toBe('brightness(1) blur(0px)')
  expect(r.start).toBe('brightness(1) blur(0px)')
  await page.close()
})

// The collapsing frame flashes in the chosen colour mixed toward white, not a saturated hue:
// brightness(3) on a teal frame clipped to pure cyan (#00FFFF). Each sampled pixel must lie between
// the frame colour, teal (0, 154, 155), and teal 70 % toward white, (179, 225, 225).
test('the crt transition collapse flashes a tint of its colour, not a saturated hue', async () => {
  const page = await open('#/a/green/1')
  await page.evaluate("import('/src/fx/crt.ts').then((m) => { window.__transitionCrt = m.transitionCrt })")
  await page.evaluate(() => {
    const div = (parent: HTMLElement, css: string) => {
      const d = parent.appendChild(document.createElement('div'))
      d.style.cssText = css
      return d
    }
    const stage = div(document.body, 'position:fixed;left:0;top:0;width:400px;height:400px;z-index:99999')
    const worlds = div(stage, 'position:absolute;inset:0')
    const from = div(worlds, 'position:absolute;inset:0;background:#009A9B')
    const to = div(worlds, 'position:absolute;inset:0;background:#fff')
    const tl = (window as any).__transitionCrt({ el: from }, { el: to }, { color: 'teal' })
    tl.pause(0)
    ;(window as any).__seek = (t: number) => void tl.seek(t)
  })
  const px: number[][] = []
  for (const t of [0.05, 0.1, 0.15, 0.19]) {
    await page.evaluate((t) => (window as any).__seek(t), t)
    const png = (await page.screenshot({ clip: { x: 200, y: 200, width: 1, height: 1 } })).toString('base64')
    const [r, g, b] = await page.evaluate(async (src) => {
      const img = new Image()
      img.src = `data:image/png;base64,${src}`
      await img.decode()
      const c = document.createElement('canvas').getContext('2d')!
      c.drawImage(img, 0, 0)
      return [...c.getImageData(0, 0, 1, 1).data]
    }, png)
    px.push([r, g, b])
  }
  const [lo, hi] = [[0, 154, 155], [179, 225, 225]]
  const between = px.map((p) => p.every((c, i) => c >= lo[i] - 8 && c <= hi[i] + 8))
  expect({ px, between }).toEqual({ px, between: px.map(() => true) })
  await page.close()
})

// flash: "soft" opens power-on at brightness(1.4), not 2.2, and the beam keeps more of the phosphor colour.
test('flash soft lowers the power-on peak and tints the beam', async () => {
  const page = await open('#/a/green/1')
  await page.evaluate("import('/src/fx/crt.ts').then((m) => { window.__crt = m.crt })")
  const peak = (flash?: string) =>
    page.evaluate((flash) => {
      const html = document.body.appendChild(document.createElement('div'))
      const h = (window as any).__crt({ html, rect: { x: 0, y: 0, w: 1920, h: 1080 }, problem: () => {} }, { lines: ['A'], ...(flash ? { flash } : {}) })
      const tl = new (window.klappe.canvases[0].tl.constructor as any)({ paused: true })
      h.powerOn(tl)
      const screen = h.root.querySelector('.k-crt-screen') as HTMLElement
      tl.seek(0.43) // the screen shows as the beam opens: the settle's first frame
      const out = { filter: screen.style.filter, soft: h.root.classList.contains('k-crt-soft') }
      html.remove()
      return out
    }, flash)
  expect(await peak()).toEqual({ filter: expect.stringContaining('brightness(2.'), soft: false })
  expect(await peak('soft')).toEqual({ filter: expect.stringContaining('brightness(1.3'), soft: true })
  await page.close()
})

// The crt transition opens the new canvas at brightness(1.4) by default; flash "full" opens it at 3, which washes out the tint.
test('the crt transition opens the new canvas soft unless flash is full', async () => {
  const page = await open('#/a/green/1')
  await page.evaluate("import('/src/fx/crt.ts').then((m) => { window.__transitionCrt = m.transitionCrt })")
  const open_ = (flash?: string) =>
    page.evaluate((flash) => {
      const stage = document.body.appendChild(document.createElement('div'))
      const worlds = stage.appendChild(document.createElement('div'))
      const from = worlds.appendChild(document.createElement('div'))
      const to = worlds.appendChild(document.createElement('div'))
      const tl = (window as any).__transitionCrt({ el: from }, { el: to }, flash ? { flash } : {})
      tl.pause(0.48) // just after the new canvas shows
      const f = worlds.style.filter
      tl.progress(1)
      stage.remove()
      return f
    }, flash)
  expect(await open_()).toBe('brightness(1.4)')
  expect(await open_('soft')).toBe('brightness(1.4)')
  expect(await open_('full')).toBe('brightness(3)')
  await page.close()
})
