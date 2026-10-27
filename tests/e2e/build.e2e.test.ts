import { chromium } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'

// The static build of decks/demo, served from a sub-path: relative asset URLs must still load.
let out = ''
let server: Server
beforeAll(async () => {
  if (!inject('IS_DEMO_DECK')) return // the title check needs decks/demo; a deck repo builds its own deck
  out = mkdtempSync(path.join(tmpdir(), 'klappe-build-'))
  await build({ configFile: fileURLToPath(new URL('../../vite.config.ts', import.meta.url)), build: { outDir: out, emptyOutDir: true }, logLevel: 'silent' })
  const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
  server = createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url!, 'http://x').pathname)
    if (!p.startsWith('/sub/deck/')) return void res.writeHead(404).end()
    try {
      const file = path.join(out, p.slice('/sub/deck/'.length) || 'index.html')
      res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file))
    } catch {
      res.writeHead(404).end()
    }
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
}, 300_000)
afterAll(() => {
  server?.close()
  if (out) rmSync(out, { recursive: true, force: true })
})

test.skipIf(!inject('IS_DEMO_DECK'))('the built deck runs from a sub-path and the page title is the deck title', async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    const port = (server.address() as { port: number }).port
    await page.goto(`http://127.0.0.1:${port}/sub/deck/index.html`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    expect(await page.title()).toBe('klappe demo')
  } finally {
    await browser.close()
  }
})

// Review mode needs the dev server's route: the built deck has none.
test.skipIf(!inject('IS_DEMO_DECK'))('the built deck has no review mode', async () => {
  const browser = await chromium.launch()
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
    const page = await context.newPage()
    const port = (server.address() as { port: number }).port
    await page.goto(`http://127.0.0.1:${port}/sub/deck/index.html?review=1`)
    await expect.poll(() => page.locator('body').textContent(), { timeout: 30_000 }).toContain('Review mode needs the dev server')
    await page.goto(`http://127.0.0.1:${port}/sub/deck/index.html`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    let opened = false
    context.on('page', () => (opened = true))
    await page.keyboard.press('r')
    await page.waitForTimeout(1000)
    expect(opened).toBe(false)
  } finally {
    await browser.close()
  }
})
