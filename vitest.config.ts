import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url))

export default defineConfig({
  test: {
    projects: [
      {
        // Same aliases as vite.config.ts, so fixtures can import "klappe/fx" in unit tests.
        resolve: { alias: { 'klappe/fx': src('fx'), 'klappe/types': src('types') } },
        test: {
          name: 'unit',
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
        },
      },
    ],
  },
})
