import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { openDeck, showStep } from './pdf.mjs'

// Screenshots of chosen steps at the two sizes the look review checks, each step as it ends with no UI on top.
export const SIZES = [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }]
const THUMB = { w: 480, h: 270, cols: 4 }

// The steps a target names: "<section>", "<section>/<scene>" or "<section>/<scene>/<step>", as in a deep link
// ("#/" in front is fine). No targets: every step. last: only the last step of each scene a section or scene target
// names; a step target is shot as named. Returns the steps, and the targets that name none.
export function pickSteps(steps, targets, last) {
  const parts = targets.map((t) => t.replace(/^#?\/?/, '').split('/'))
  const hit = (s, [section, scene, step]) => s.section === section && (!scene || s.scene === scene) && (!step || s.step === Number(step))
  const isLast = (s) => steps[s.index + 1]?.scene !== s.scene
  const picked = parts.length
    ? steps.filter((s) => parts.some((p) => hit(s, p) && (!last || p[2] || isLast(s))))
    : steps.filter((s) => !last || isLast(s))
  return { picked, unknown: targets.filter((_, i) => !steps.some((s) => hit(s, parts[i]))) }
}

const name = (s) => `${s.section}.${s.scene}.${s.step}.png`

// One picture per section: the last step of each of its scenes, labelled, in a grid.
async function sheets(browser, outDir, shots) {
  const bySection = Map.groupBy(shots, (s) => s.step.section)
  const out = []
  const page = await browser.newPage({ viewport: { width: THUMB.cols * THUMB.w + (THUMB.cols + 1) * 16, height: 400 } })
  for (const [section, list] of bySection) {
    const cells = list.map(({ step, file }) =>
      `<figure><img src="data:image/png;base64,${fs.readFileSync(file).toString('base64')}"><figcaption>${step.scene} · step ${step.step}</figcaption></figure>`)
    await page.setContent(
      `<style>body { margin: 0; padding: 16px; background: #1b1d22; color: #e6e8ec; font: 16px system-ui, sans-serif; }
      h1 { font-size: 22px; margin: 0 0 12px; } main { display: grid; grid-template-columns: repeat(${THUMB.cols}, ${THUMB.w}px); gap: 16px; }
      figure { margin: 0; } img { display: block; width: ${THUMB.w}px; height: ${THUMB.h}px; } figcaption { padding-top: 6px; }</style>
      <h1>${section}</h1><main>${cells.join('')}</main>`,
    )
    const file = path.join(outDir, `sheet-${section}.png`)
    await page.screenshot({ path: file, fullPage: true })
    out.push(file)
  }
  return out
}

// Writes <outDir>/<w>x<h>/<section>.<scene>.<step>.png for each picked step at both sizes, and with sheet,
// <outDir>/sheet-<section>.png from the 1920x1080 shots of each scene's last step.
// sizes: a subset of SIZES for a quick check. at: shoot each step that many ms into its play, not as it ends.
export async function shoot(url, outDir, { targets = [], last = false, sheet = false, theme, sizes = SIZES, at } = {}) {
  const browser = await chromium.launch()
  try {
    const files = []
    let picked = []
    let unknown = []
    let report = { problems: [], errors: [] }
    const lastShots = []
    for (const size of sizes) {
      const page = await openDeck(browser, url, size, theme ? { theme } : {})
      const steps = await page.evaluate(() => window.klappe.steps)
      ;({ picked, unknown } = pickSteps(steps, targets, last))
      if (unknown.length) return { files, sheets: [], unknown, ...report }
      const dir = path.join(outDir, `${size.width}x${size.height}`)
      fs.mkdirSync(dir, { recursive: true })
      for (const s of picked) {
        await showStep(page, s.index, at)
        const file = path.join(dir, at === undefined ? name(s) : name(s).replace(/\.png$/, `@${at}ms.png`))
        await page.screenshot({ path: file })
        files.push(file)
        if (size === sizes[0] && steps[s.index + 1]?.scene !== s.scene) lastShots.push({ step: s, file })
      }
      const r = await page.evaluate(() => ({ problems: [...window.klappe.problems], errors: [...window.klappe.errors] }))
      // A page error can come from one size only (a layout that breaks at 1366).
      report = { problems: r.problems, errors: [...new Set([...report.errors, ...r.errors])] }
      await page.close()
    }
    return { files, sheets: sheet ? await sheets(browser, outDir, lastShots) : [], unknown, ...report }
  } finally {
    await browser.close()
  }
}
