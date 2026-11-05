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

// Readies the step on screen for print and returns its links. A YouTube or Vimeo player is black in a headless
// browser: each one in the frame gets a still on top, the author's offline still or else the host's thumbnail
// (none offline). A link is an <a href>, a QR code of a link, an online video's box, or a web or mail address in
// the text; each comes back with its box as fractions of the frame, one box per line of a wrapped address.
export async function printable(page) {
  return page.evaluate(async () => {
    const W = innerWidth
    const H = innerHeight
    const inFrame = (r) => r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < W && r.top < H
    const seen = (el) => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && inFrame(el.getBoundingClientRect())
    const thumb = (href) => {
      const api = /vimeo\.com$/.test(new URL(href).hostname) ? 'https://vimeo.com/api/oembed.json?url=' : 'https://www.youtube.com/oembed?format=json&url='
      return fetch(api + encodeURIComponent(href), { signal: AbortSignal.timeout(5000) }).then((r) => r.json()).then((j) => j.thumbnail_url).catch(() => undefined)
    }
    await Promise.all([...document.querySelectorAll('[data-k-video="embed"]')].filter(seen).map(async (player) => {
      const src = player.dataset.kPoster ?? (await thumb(player.parentElement.dataset.kHref))
      if (!src) return
      const img = player.parentElement.appendChild(new Image())
      Object.assign(img.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'contain', background: '#000' })
      img.src = src
      await img.decode().catch(() => {})
    }))

    const links = []
    const add = (href, r) => inFrame(r) && links.push({ href, x: r.left / W, y: r.top / H, w: r.width / W, h: r.height / H })
    const LINKED = 'a[href], [data-k-href]'
    for (const el of document.querySelectorAll(LINKED)) if (seen(el)) add(el.href || el.dataset.kHref, el.getBoundingClientRect())
    const ADDRESS = /\bhttps?:\/\/[^\s<>"]+|\bwww\.[^\s<>"]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n; (n = walk.nextNode()); ) {
      const found = [...n.data.matchAll(ADDRESS)]
      if (!found.length || n.parentElement.closest(LINKED) || !seen(n.parentElement)) continue
      for (const m of found) {
        const text = m[0].replace(/[.,;:!?)\]}'"]+$/, '') // the sentence's full stop is not part of the address
        const href = /^https?:/.test(text) ? text : text.startsWith('www.') ? `https://${text}` : `mailto:${text}`
        const range = document.createRange()
        range.setStart(n, m.index)
        range.setEnd(n, m.index + text.length)
        for (const r of range.getClientRects()) add(href, r)
      }
    }
    return links
  })
}

// A step's picture with its links on top, scaled to the box it is set in.
const picture = (shot, links) =>
  `<div class="k-pic"><img src="data:image/jpeg;base64,${shot}">${links
    .map((l) => `<a href="${escape(l.href)}" style="left:${l.x * 100}%;top:${l.y * 100}%;width:${l.w * 100}%;height:${l.h * 100}%"></a>`)
    .join('')}</div>`
const PICTURE_CSS = '.k-pic { position: relative; } .k-pic img { display: block; width: 100%; } .k-pic a { position: absolute; }'

// The page before the appendix, shot on the deck page: klappe's word for it in the deck's language, set in the theme's
// heading font and colours.
async function appendixShot(page, quality) {
  await page.evaluate(async () => {
    const el = document.body.appendChild(document.createElement('div'))
    el.id = 'k-pdf-appendix'
    el.textContent = window.klappe.t('appendix', window.klappe.deck.meta.lang)
    Object.assign(el.style, { position: 'fixed', inset: '0', zIndex: '2147483647', display: 'grid', placeItems: 'center',
      background: 'var(--k-bg)', color: 'var(--k-fg)', font: '600 var(--k-size-title) var(--k-font-heading)' })
    await document.fonts.ready
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  })
  const shot = (await page.screenshot({ type: 'jpeg', quality })).toString('base64')
  await page.evaluate(() => document.getElementById('k-pdf-appendix').remove())
  return shot
}

// One handout page: the scene's last step with its links, its title, and the notes as paragraphs.
export function handoutPage({ shot, links = [], title, notes }) {
  const paras = notes.flatMap((n) => n.split(/\n\s*\n/)).map((p) => p.trim()).filter(Boolean)
  return `<section>${picture(shot, links)}<h2>${escape(title)}</h2>${paras.map((p) => `<p>${escape(p)}</p>`).join('')}</section>`
}

// A4 portrait: the picture across the top, the notes under it in a plain system face for print.
const HANDOUT_CSS = `@page { size: A4; margin: 14mm; } body { margin: 0; font: 11pt/1.45 system-ui, sans-serif; color: #111; }
section + section { break-before: page; } h2 { font-size: 15pt; margin: 6mm 0 3mm; } p { margin: 0 0 2.5mm; }`

// Prints the deck at url to the PDF out, one page per scene: its last step as it ends, with no UI on top, and its
// links clickable. With handout, one A4 page per scene instead: that picture, its title and its speaker notes (the
// scene's, then each step's). The appendix comes last (a ?cut= in url prints that cut): a page that names it, or
// "Appendix:" before each handout title. width is the pictures' width in pixels (1920: one per scene px; the page
// keeps its size), quality their JPEG quality, 1 to 100. Returns the page count and the deck problems and page errors.
export async function exportPdf(url, out, { handout = false, width = 1920, quality = 90 } = {}) {
  const browser = await chromium.launch()
  try {
    const page = await openDeck(browser, url, { width, height: Math.round((width * 9) / 16) })
    const k = 1920 / width
    const { width: W, height: H } = page.viewportSize()
    const steps = await page.evaluate(() => window.klappe.steps)
    const picked = steps.filter((s, i) => steps[i + 1]?.scene !== s.scene)
    const shots = []
    for (const [i, s] of picked.entries()) {
      if (!handout && s.appendix && !picked[i - 1]?.appendix) shots.push({ shot: await appendixShot(page, quality), links: [] })
      await showStep(page, s.index)
      const links = await printable(page)
      shots.push({ shot: (await page.screenshot({ type: 'jpeg', quality })).toString('base64'), links })
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
        ? `<style>${HANDOUT_CSS} ${PICTURE_CSS}</style>` +
            picked.map((s, i) => handoutPage({ ...shots[i], ...scenes[s.scene], title: `${s.appendix ? `${label}: ` : ''}${scenes[s.scene].title}` })).join('')
        : `<style>@page { size: ${Math.round(W * k)}px ${Math.round(H * k)}px; margin: 0; } body { margin: 0; } ${PICTURE_CSS} .k-pic + .k-pic { break-before: page; }</style>` +
            shots.map((s) => picture(s.shot, s.links)).join(''),
    )
    fs.mkdirSync(path.dirname(out), { recursive: true })
    await sheet.pdf({ path: out, preferCSSPageSize: true, printBackground: true })
    return { pages: shots.length, problems, errors }
  } finally {
    await browser.close()
  }
}
