import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { klappeScan } from './bin/scan-plugin.mjs'

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url))

export default defineConfig({
  test: {
    // The on-disk transform cache keeps a stale import.meta.glob (src/deck/fixtures.ts) after a fixture is added.
    fsModuleCache: false,
    projects: [
      {
        // Same aliases as vite.config.ts, so fixtures can import "klappe/fx" in unit tests.
        resolve: { alias: { 'klappe/fx': src('fx'), 'klappe/types': src('types') } },
        // The unit tests name icons too (fx-icons.test.ts).
        plugins: [klappeScan({ klappeDir: fileURLToPath(new URL('.', import.meta.url)), deckDir: src('deck/fixtures'), extraDirs: [fileURLToPath(new URL('./tests/unit', import.meta.url))] })],
        test: {
          name: 'unit',
          css: { include: /src\/themes\/.*\.css/ }, // theme tests read the real token files
          include: ['tests/unit/**/*.test.ts', 'tests/lint/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['tests/e2e/**/*.e2e.test.ts'],
          globalSetup: ['tests/e2e/setup.ts'],
          testTimeout: 120_000,
          hookTimeout: 120_000,
          // Each file drives its own browser; more at once timed out tests on a busy machine.
          maxWorkers: 6,
          sequence: { groupOrder: 1 }, // vitest needs its own group for a different maxWorkers; unit runs first
        },
      },
    ],
  },
})
