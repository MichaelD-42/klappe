import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

const W = 1920 // the stage size, so a screenshot pixel is a scene pixel
const H = 1080

// The deck at url in a new page of browser, every play a seek to its end and no UI on top, ready for goto(i).
// params: more URL flags (theme).
export async function openDeck(browser, url, viewport = { width: W, height: H }, params = {}) {
  const page = await browser.newPage({ viewport })
  const u = new URL(url)
  u.searchParams.set('instant', '1') // every play seeks to its end
  u.searchParams.set('reducedmotion', '1') // camera cuts, and backgrounds hold still
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  await page.goto(u.href)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 60_000 })
  await page.addStyleTag({ content: '.k-ui { display: none !important; }' })
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

// Prints the deck at url to the PDF out, one page per step: the step's end state, with no UI on top.
// Returns the page count and the deck problems and page errors, for the terminal.
export async function exportPdf(url, out) {
  const browser = await chromium.launch()
  try {
    const page = await openDeck(browser, url)
    const n = await page.evaluate(() => window.klappe.steps.length)
    const shots = []
    for (let i = 0; i < n; i++) {
      await showStep(page, i)
      shots.push((await page.screenshot({ type: 'jpeg', quality: 90 })).toString('base64'))
    }
    const { problems, errors } = await page.evaluate(() => ({ problems: [...window.klappe.problems], errors: [...window.klappe.errors] }))

    const sheet = await browser.newPage()
    await sheet.setContent(
      `<style>@page { size: ${W}px ${H}px; margin: 0; } body { margin: 0; } img { display: block; width: ${W}px; height: ${H}px; } img + img { break-before: page; }</style>` +
        shots.map((s) => `<img src="data:image/jpeg;base64,${s}">`).join(''),
    )
    fs.mkdirSync(path.dirname(out), { recursive: true })
    await sheet.pdf({ path: out, preferCSSPageSize: true, printBackground: true })
    return { pages: n, problems, errors }
  } finally {
    await browser.close()
  }
}
