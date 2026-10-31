import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
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
  // Vitest sets NODE_ENV=test, which Vite folds into the optimizer's config hash, and `klappe test` runs this setup too
  // (deck repos, and the CLI tests in a temp cwd, whose aliases differ): servers sharing a cache dir re-optimize after
  // each other. So: one dir per cwd, and a throwaway one for a temp cwd.
  const scratch = process.cwd().startsWith(tmpdir())
  const cacheDir = scratch
    ? mkdtempSync(path.join(tmpdir(), 'klappe-e2e-cache-'))
    : fileURLToPath(new URL(`../../node_modules/.vite-e2e-${createHash('sha1').update(process.cwd()).digest('hex').slice(0, 8)}`, import.meta.url))
  const server = await createServer({ configFile: fileURLToPath(new URL('../../vite.config.ts', import.meta.url)), cacheDir, server: { port: 0, strictPort: false } })
  await server.listen()
  // Pages must not load while the optimizer still scans, or a late dep bundle turns into 504 Outdated Optimize Dep.
  await (server.environments.client as any).depsOptimizer?.scanProcessing
  await server.waitForRequestsIdle()
  project.provide('BASE_URL', server.resolvedUrls!.local[0])
  const deckDir = server.config.resolve.alias.find((a) => a.find === '@deck')?.replacement ?? ''
  const demoDir = fileURLToPath(new URL('../../decks/demo', import.meta.url))
  project.provide('IS_DEMO_DECK', !!deckDir && path.relative(deckDir, demoDir) === '')
  return async () => {
    await server.close()
    if (scratch) rmSync(cacheDir, { recursive: true, force: true })
  }
}
