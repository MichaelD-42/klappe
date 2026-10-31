import { chromium } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { expect, test } from 'vitest'

// A deck repo's deck lies outside klappe's Vite root: a scene folder added while `klappe dev` runs must still show.
test('a running dev server picks up a new scene folder in a deck outside its root', async () => {
  const deck = fs.mkdtempSync(path.join(os.tmpdir(), 'klappe-watch-'))
  fs.mkdirSync(path.join(deck, 'sections/10-a/10-b'), { recursive: true })
  fs.writeFileSync(path.join(deck, 'deck.md'), '---\ntitle: Watch\n---\n')
  fs.writeFileSync(path.join(deck, 'sections/10-a/section.md'), '# A\n')
  fs.writeFileSync(path.join(deck, 'sections/10-a/10-b/scene.md'), '## B\n\n- one\n')
  const was = process.env.KLAPPE_DECK_DIR
  process.env.KLAPPE_DECK_DIR = deck // vite.config reads it when the server loads it
  // Its own dependency cache: another deck changes the config hash, and a re-optimise in the shared node_modules/.vite
  // would pull the deps from under the e2e server the other tests use (a cold cache on CI).
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'klappe-watch-cache-'))
  const server = await createServer({ configFile: fileURLToPath(new URL('../../vite.config.ts', import.meta.url)), cacheDir, server: { port: 0 }, logLevel: 'warn' })
  if (was === undefined) delete process.env.KLAPPE_DECK_DIR
  else process.env.KLAPPE_DECK_DIR = was
  const browser = await chromium.launch()
  try {
    await server.listen()
    const page = await browser.newPage()
    const scenes = async () => {
      await page.goto(server.resolvedUrls!.local[0])
      await page.waitForFunction(() => window.klappe?.steps, undefined, { timeout: 30_000 })
      return page.evaluate(() => window.klappe.deck.sections.flatMap((s: { scenes: { id: string }[] }) => s.scenes.map((c) => c.id)))
    }
    expect(await scenes()).toEqual(['b'])
    fs.mkdirSync(path.join(deck, 'sections/10-a/20-c'))
    fs.writeFileSync(path.join(deck, 'sections/10-a/20-c/scene.md'), '## C\n\n- two\n')
    await expect.poll(scenes, { timeout: 15_000 }).toEqual(['b', 'c'])
  } finally {
    await browser.close()
    await server.close()
    fs.rmSync(deck, { recursive: true })
    fs.rmSync(cacheDir, { recursive: true, force: true })
  }
}, 90_000)
