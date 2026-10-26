import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { klappeScan } from './bin/scan-plugin.mjs'
import { klappeReview } from './bin/review-plugin.mjs'

const klappeDir = path.dirname(fileURLToPath(import.meta.url))
const cwd = process.cwd()
const deckDir = process.env.KLAPPE_DECK_DIR ?? path.join(cwd, 'decks', 'demo')
// The e2e tests point the review route at a temp file.
const reviewFile = process.env.KLAPPE_REVIEW_FILE ?? path.join(deckDir, 'review.md')

// A path under <root>/.claude/worktrees: other checkouts of the project, whose edits would reload the page.
// Relative to root, so a server that runs inside a worktree still watches its own files.
export const inWorktrees = (root: string) => (file: string) => {
  const [a, b] = path.relative(root, file).split(/[\\/]/)
  return a === '.claude' && b === 'worktrees'
}

export default defineConfig({
  root: klappeDir,
  plugins: [klappeScan({ klappeDir, deckDir, extraDirs: [path.join(klappeDir, 'src', 'deck', 'fixtures')] }), klappeReview({ file: reviewFile })],
  base: './', // relative asset URLs, so a build works from any folder (GitHub Pages serves under /klappe/)
  resolve: { alias: { '@deck': deckDir, '@themes': path.join(cwd, 'themes'), 'klappe/fx': path.join(klappeDir, 'src', 'fx') } },
  // Builder worktrees under .claude/worktrees would reload the page mid e2e run.
  server: { fs: { allow: [klappeDir, cwd, deckDir] }, watch: { ignored: [inWorktrees(cwd), inWorktrees(klappeDir)] } },
  build: { outDir: path.join(cwd, 'dist', path.basename(deckDir)), emptyOutDir: true },
})
