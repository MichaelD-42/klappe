import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
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
        },
      },
    ],
  },
})
