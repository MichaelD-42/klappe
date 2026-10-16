import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { TestProject } from 'vitest/node'

declare module 'vitest' {
  export interface ProvidedContext {
    BASE_URL: string
    // The served deck is klappe's own decks/demo, so demo-specific checks (acceptance suite) apply.
    IS_DEMO_DECK: boolean
  }
}

export default async function setup(project: TestProject) {
  const server = await createServer({ configFile: fileURLToPath(new URL('../../vite.config.ts', import.meta.url)), server: { port: 0, strictPort: false } })
  await server.listen()
  project.provide('BASE_URL', server.resolvedUrls!.local[0])
  const deckDir = server.config.resolve.alias.find((a) => a.find === '@deck')?.replacement ?? ''
  const demoDir = fileURLToPath(new URL('../../decks/demo', import.meta.url))
  project.provide('IS_DEMO_DECK', !!deckDir && path.relative(deckDir, demoDir) === '')
  return () => server.close()
}
