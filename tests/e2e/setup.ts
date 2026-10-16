import { createServer } from 'vite'
import type { TestProject } from 'vitest/node'

declare module 'vitest' {
  export interface ProvidedContext {
    BASE_URL: string
  }
}

export default async function setup(project: TestProject) {
  const server = await createServer({ configFile: 'vite.config.ts', server: { port: 0, strictPort: false } })
  await server.listen()
  project.provide('BASE_URL', server.resolvedUrls!.local[0])
  return () => server.close()
}
