import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, inject, test } from 'vitest'
import { chromium } from '@playwright/test'
import { exportPdf, openDeck, printable, showStep } from '../../bin/pdf.mjs'

const pages = (pdf: string) => pdf.match(/\/Type\s*\/Page\b/g)?.length

// One page per scene, at its last step, and the deck problems come back for the terminal instead of covering a page.
test('the PDF has one page per scene of the deck', async () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'klappe-pdf-')), 'deck.pdf')
  try {
    const r = await exportPdf(`${inject('BASE_URL')}/?fixture=fx-code`, out)
    expect(r.pages).toBe(7)
    expect(r.problems).toHaveLength(6)
    expect(r.errors).toEqual([])
    const pdf = fs.readFileSync(out, 'latin1')
    expect(pdf.startsWith('%PDF-')).toBe(true)
    expect(pages(pdf)).toBe(7)
  } finally {
    fs.rmSync(path.dirname(out), { recursive: true })
  }
})

// A handout: one page per scene, at its last step, with the speaker notes under the picture.
test('a handout has one page per scene', async () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'klappe-pdf-')), 'handout.pdf')
  try {
    const r = await exportPdf(`${inject('BASE_URL')}/?fixture=fx-code`, out, { handout: true })
    expect(r.pages).toBe(7)
    expect(r.errors).toEqual([])
    expect(fs.readFileSync(out, 'latin1').match(/\/Type\s*\/Page\b/g)).toHaveLength(7)
  } finally {
    fs.rmSync(path.dirname(out), { recursive: true })
  }
})

// A cut prints its own steps; the appendix prints last, after a page that names it.
test('the PDF of a cut has its scenes, then a page that names the appendix and the appendix scenes', async () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'klappe-pdf-')), 'cut.pdf')
  try {
    const r = await exportPdf(`${inject('BASE_URL')}/?fixture=cuts&cut=short`, out)
    expect(r.pages).toBe(4) // a/one, c/three, the appendix page, x/spare
    expect(r.problems).toEqual([])
    expect(pages(fs.readFileSync(out, 'latin1'))).toBe(4)
    const handout = await exportPdf(`${inject('BASE_URL')}/?fixture=cuts&cut=short`, out, { handout: true })
    expect(handout.pages).toBe(3)
  } finally {
    fs.rmSync(path.dirname(out), { recursive: true })
  }
})

// A link or an address in the text, a QR code of a link and an online video are clickable on the page, in the PDF and the handout.
test('links, addresses, QR codes and online videos are clickable in the PDF', async () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'klappe-pdf-')), 'links.pdf')
  try {
    for (const handout of [false, true]) {
      const r = await exportPdf(`${inject('BASE_URL')}/?fixture=pdf`, out, { handout })
      expect(r.errors).toEqual([])
      const uris = [...fs.readFileSync(out, 'latin1').matchAll(/\/URI\s*\(([^)]*)\)/g)].map((m) => m[1])
      expect(uris.sort()).toEqual(['https://klappe.test/docs', 'https://klappe.test/guide', 'https://klappe.test/slides', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'mailto:ana@klappe.test'])
    }
  } finally {
    fs.rmSync(path.dirname(out), { recursive: true })
  }
})

// A YouTube or Vimeo player prints as a still, not the black of a player in a headless browser: the author's
// offline still here; without one, the host's thumbnail (not tested: it needs the network).
test('a video player prints as its still', async () => {
  const browser = await chromium.launch()
  try {
    const page = await openDeck(browser, `${inject('BASE_URL')}/?fixture=pdf`)
    await showStep(page, await page.evaluate(() => window.klappe.steps.findIndex((s: { scene: string }) => s.scene === 'clip')))
    await printable(page)
    const still = await page.evaluate(() => {
      const box = document.querySelector('[data-k-video="embed"]')!.getBoundingClientRect()
      const img = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) as HTMLImageElement
      return { src: img.src?.startsWith('data:image/svg+xml'), painted: img.complete && img.naturalWidth > 0 }
    })
    expect(still).toEqual({ src: true, painted: true })
  } finally {
    await browser.close()
  }
})

// width and quality set the pictures' pixels and JPEG quality; the page keeps its size.
test('a smaller width and quality make a smaller PDF of the same page size', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'klappe-pdf-'))
  try {
    const url = `${inject('BASE_URL')}/?fixture=pdf`
    await exportPdf(url, path.join(dir, 'big.pdf'))
    await exportPdf(url, path.join(dir, 'small.pdf'), { width: 960, quality: 40 })
    const [big, small] = ['big', 'small'].map((n) => fs.readFileSync(path.join(dir, `${n}.pdf`), 'latin1'))
    expect(small.length).toBeLessThan(big.length / 2)
    const box = (pdf: string) => /\/MediaBox\s*\[([^\]]*)\]/.exec(pdf)?.[1].trim()
    expect(box(small)).toBe(box(big))
  } finally {
    fs.rmSync(dir, { recursive: true })
  }
})

// A Markdown link in a step is a link on stage, its label in the text; a click on it opens it and does not step.
// A link that is not to the web or a mail address stays as written.
test('a Markdown link in scene.md is a link on stage that a click does not step past', async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(`${inject('BASE_URL')}/?fixture=pdf#/a/links/3`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0)
    const p = page.locator('.k-scene p[data-step="3"]')
    await expect.poll(() => p.textContent()).toBe('Read the guide, not [this](javascript:void0).')
    const a = p.locator('a')
    expect(await a.count()).toBe(1)
    expect(await a.getAttribute('href')).toBe('https://klappe.test/guide')
    expect(await a.getAttribute('target')).toBe('_blank')
    await page.route('https://klappe.test/**', (r) => r.fulfill({ body: 'ok' }))
    const [tab] = await Promise.all([page.context().waitForEvent('page'), a.click()])
    await tab.close()
    expect(await page.evaluate(() => window.klappe.stepper.index)).toBe(2)
  } finally {
    await browser.close()
  }
})
