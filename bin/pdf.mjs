import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

// The deck at url in a new page of browser, every play a seek to its end and no UI on top, ready for goto(i).
// viewport: its width over 1920 scales the deck's frame (deck.md frame), so a 1920 wide viewport makes a
// screenshot pixel a scene pixel, whatever the frame's shape. params: more URL flags (theme).
export async function openDeck(browser, url, viewport = { width: 1920, height: 1080 }, params = {}) {
  const page = await browser.newPage({ viewport })
  const u = new URL(url)
  u.searchParams.set('instant', '1') // every play seeks to its end
  u.searchParams.set('reducedmotion', '1') // camera cuts, and backgrounds hold still
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  await page.goto(u.href)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 60_000 })
  await page.addStyleTag({ content: '.k-ui { display: none !important; }' })
  const frame = await page.evaluate(() => window.klappe.deck.meta.frame ?? { w: 1920, h: 1080 })
  const k = viewport.width / 1920
  const size = { width: Math.round(frame.w * k), height: Math.round(frame.h * k) }
  if (size.width !== viewport.width || size.height !== viewport.height) await page.setViewportSize(size)
  return page
}

// Shows step i (0-based) as it ends, painted, with its fonts in and its pictures decoded. With at (ms): as it
// stood that far into its play, by a seek of its canvas, so it is the same picture each run.
export async function showStep(page, i, at) {
  await page.evaluate(async ({ i, at }) => {
    const k = window.klappe
    await k.stepper.goto(i, 'cut')
    if (at !== undefined) {
      const c = k.canvases[k.steps[i].canvas]
      let from = 0 // the step's play starts at the previous step on its canvas, as in the stepper's move
      for (let j = i - 1; j >= 0; j--)
        if (k.steps[j].canvas === k.steps[i].canvas) {
          from = c.tl.labels[`e:${j}`]
          break
        }
      c.tl.seek(Math.min(from + at / 1000, c.tl.labels[`e:${i}`]), false)
    }
    await document.fonts.ready
    await Promise.all([...document.images].map((im) => im.decode().catch(() => {}))) // a JPEG paints late without this
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))) // one painted frame
  }, { i, at })
}

const escape = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

// The page before the appendix, shot on the deck page: klappe's word for it in the deck's language, set in the theme's
// heading font and colours.
async function appendixShot(page) {
  await page.evaluate(async () => {
    const el = document.body.appendChild(document.createElement('div'))
    el.id = 'k-pdf-appendix'
    el.textContent = window.klappe.t('appendix', window.klappe.deck.meta.lang)
    Object.assign(el.style, { position: 'fixed', inset: '0', zIndex: '2147483647', display: 'grid', placeItems: 'center',
      background: 'var(--k-bg)', color: 'var(--k-fg)', font: '600 var(--k-size-title) var(--k-font-heading)' })
    await document.fonts.ready
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  })
  const shot = (await page.screenshot({ type: 'jpeg', quality: 90 })).toString('base64')
  await page.evaluate(() => document.getElementById('k-pdf-appendix').remove())
  return shot
}

// One handout page: the scene's last step, its title, and the notes as paragraphs.
export function handoutPage({ shot, title, notes }) {
  const paras = notes.flatMap((n) => n.split(/\n\s*\n/)).map((p) => p.trim()).filter(Boolean)
  return `<section><img src="data:image/jpeg;base64,${shot}"><h2>${escape(title)}</h2>${paras.map((p) => `<p>${escape(p)}</p>`).join('')}</section>`
}

// A4 portrait: the picture across the top, the notes under it in a plain system face for print.
const HANDOUT_CSS = `@page { size: A4; margin: 14mm; } body { margin: 0; font: 11pt/1.45 system-ui, sans-serif; color: #111; }
section + section { break-before: page; } img { display: block; width: 100%; } h2 { font-size: 15pt; margin: 6mm 0 3mm; } p { margin: 0 0 2.5mm; }`

// Prints the deck at url to the PDF out, one page per step: the step's end state, with no UI on top. With handout,
// one A4 page per scene instead: its last step, its title and its speaker notes (the scene's, then each step's).
// The appendix comes last (a ?cut= in url prints that cut): a page that names it, or "Appendix:" before each handout title.
// Returns the page count and the deck problems and page errors, for the terminal.
export async function exportPdf(url, out, { handout = false } = {}) {
  const browser = await chromium.launch()
  try {
    const page = await openDeck(browser, url)
    const { width: W, height: H } = page.viewportSize()
    const steps = await page.evaluate(() => window.klappe.steps)
    const picked = handout ? steps.filter((s, i) => steps[i + 1]?.scene !== s.scene) : steps
    const shots = []
    for (const [k, s] of picked.entries()) {
      if (!handout && s.appendix && !picked[k - 1]?.appendix) shots.push(await appendixShot(page))
      await showStep(page, s.index)
      shots.push((await page.screenshot({ type: 'jpeg', quality: 90 })).toString('base64'))
    }
    const { problems, errors, scenes, label } = await page.evaluate(() => ({
      problems: [...window.klappe.problems],
      errors: [...window.klappe.errors],
      label: window.klappe.t('appendix', window.klappe.deck.meta.lang),
      scenes: Object.fromEntries(
        window.klappe.deck.sections.flatMap((s) => s.scenes.map((c) => [c.id, { title: c.title, notes: [c.notes, ...c.steps.map((t) => t.notes)] }])),
      ),
    }))

    const sheet = await browser.newPage()
    await sheet.setContent(
      handout
        ? `<style>${HANDOUT_CSS}</style>` +
            picked.map((s, k) => handoutPage({ shot: shots[k], ...scenes[s.scene], title: `${s.appendix ? `${label}: ` : ''}${scenes[s.scene].title}` })).join('')
        : `<style>@page { size: ${W}px ${H}px; margin: 0; } body { margin: 0; } img { display: block; width: ${W}px; height: ${H}px; } img + img { break-before: page; }</style>` +
            shots.map((s) => `<img src="data:image/jpeg;base64,${s}">`).join(''),
    )
    fs.mkdirSync(path.dirname(out), { recursive: true })
    await sheet.pdf({ path: out, preferCSSPageSize: true, printBackground: true })
    return { pages: shots.length, problems, errors }
  } finally {
    await browser.close()
  }
}
