import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { klappeScan } from './bin/scan-plugin.mjs'

const klappeDir = path.dirname(fileURLToPath(import.meta.url))
const cwd = process.cwd()
const deckDir = process.env.KLAPPE_DECK_DIR ?? path.join(cwd, 'decks', 'demo')

export default defineConfig({
  root: klappeDir,
  plugins: [klappeScan({ klappeDir, deckDir, extraDirs: [path.join(klappeDir, 'src', 'deck', 'fixtures')] })],
  base: './', // relative asset URLs, so a build works from any folder (GitHub Pages serves under /klappe/)
  resolve: { alias: { '@deck': deckDir, '@themes': path.join(cwd, 'themes'), 'klappe/fx': path.join(klappeDir, 'src', 'fx') } },
  server: { fs: { allow: [klappeDir, cwd, deckDir] } },
  build: { outDir: path.join(cwd, 'dist', path.basename(deckDir)), emptyOutDir: true },
})
