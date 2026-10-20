import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const klappeDir = path.dirname(fileURLToPath(import.meta.url))
const cwd = process.cwd()
const deckDir = process.env.KLAPPE_DECK_DIR ?? path.join(cwd, 'decks', 'demo')

export default defineConfig({
  root: klappeDir,
  resolve: { alias: { '@deck': deckDir, '@themes': path.join(cwd, 'themes'), 'klappe/fx': path.join(klappeDir, 'src', 'fx') } },
  server: { fs: { allow: [klappeDir, cwd, deckDir] } },
  build: { outDir: path.join(cwd, 'dist', path.basename(deckDir)), emptyOutDir: true },
})
