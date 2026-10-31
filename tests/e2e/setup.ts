import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { TestProject } from 'vitest/node'

declare module 'vitest' {
  export interface ProvidedContext {
    BASE_URL: string
    // The served deck is klappe's own decks/demo, so demo-specific checks (acceptance suite) apply.
    IS_DEMO_DECK: boolean
    // Where the dev server's review route writes: a temp file, not the deck's review.md.
    REVIEW_FILE: string
    // Where the deck window's text edits write scene.md: a temp deck folder.
    TEXT_DIR: string
  }
}

export default async function setup(project: TestProject) {
  process.env.KLAPPE_REVIEW_FILE = path.join(mkdtempSync(path.join(tmpdir(), 'klappe-review-')), 'review.md')
  project.provide('REVIEW_FILE', process.env.KLAPPE_REVIEW_FILE)
  process.env.KLAPPE_TEXT_DIR = mkdtempSync(path.join(tmpdir(), 'klappe-text-'))
  project.provide('TEXT_DIR', process.env.KLAPPE_TEXT_DIR)
  const server = await createServer({ configFile: fileURLToPath(new URL('../../vite.config.ts', import.meta.url)), server: { port: 0, strictPort: false } })
  await server.listen()
  project.provide('BASE_URL', server.resolvedUrls!.local[0])
  const deckDir = server.config.resolve.alias.find((a) => a.find === '@deck')?.replacement ?? ''
  const demoDir = fileURLToPath(new URL('../../decks/demo', import.meta.url))
  project.provide('IS_DEMO_DECK', !!deckDir && path.relative(deckDir, demoDir) === '')
  return () => server.close()
}
