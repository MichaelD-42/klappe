#!/usr/bin/env node
import { createServer, build } from 'vite'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { syncClaude } from './sync-claude.mjs'

const klappeDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [cmd, ...rest] = process.argv.slice(2)
const i = rest.indexOf('--deck')
const decksDir = path.join(process.cwd(), 'decks')

if (!['dev', 'build', 'test', 'init'].includes(cmd)) {
  console.error('usage: klappe dev|build|test|init [--deck <id>]')
  process.exit(1)
}

let id = i >= 0 ? rest[i + 1] : undefined
if (i >= 0 && !id) {
  console.error('--deck needs an id')
  process.exit(1)
}

if (cmd === 'init') {
  if (!id || !/^[a-z0-9][a-z0-9-]*$/i.test(id)) {
    console.error('usage: klappe init --deck <id>  (letters, digits, dashes)')
    process.exit(1)
  }
  const dir = path.join(decksDir, id)
  if (fs.existsSync(dir)) {
    console.error(`Deck already exists: ${dir}. Nothing changed.`)
    process.exit(1)
  }
  fs.mkdirSync(path.join(dir, 'sections'), { recursive: true })
  fs.writeFileSync(
    path.join(dir, 'deck.md'),
    `---\ntitle: ${id}\nlang: en\ntheme: calm\nintensity: calm\nconfidential: false\n---\n`,
  )
  const pkgFile = path.join(process.cwd(), 'package.json')
  const pkg = fs.existsSync(pkgFile) ? JSON.parse(fs.readFileSync(pkgFile, 'utf8')) : { name: 'deck-repo', private: true }
  pkg.dependencies = { ...pkg.dependencies, klappe: 'file:./klappe' }
  // Existing scripts with the same name are replaced; other scripts stay.
  pkg.scripts = {
    ...pkg.scripts,
    dev: 'node klappe/bin/klappe.mjs dev',
    build: 'node klappe/bin/klappe.mjs build',
    test: 'node klappe/bin/klappe.mjs test',
    'klappe:sync': 'node klappe/bin/sync-claude.mjs',
  }
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n')
  const synced = syncClaude(klappeDir, process.cwd())
  console.log(`Created decks/${id}. Synced: ${synced?.join(', ') || 'nothing'}`)
  process.exit(0)
}
if (!id) {
  const ids = fs.existsSync(decksDir)
    ? fs.readdirSync(decksDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : []
  if (ids.length !== 1) {
    console.error(`Cannot pick a deck. Use --deck <id>. Choices: ${ids.join(', ') || '(none in ' + decksDir + ')'}`)
    process.exit(1)
  }
  id = ids[0]
}
const deckDir = path.join(decksDir, id)
if (!fs.existsSync(deckDir)) {
  console.error(`Deck not found: ${deckDir}`)
  process.exit(1)
}

process.env.KLAPPE_DECK_DIR = deckDir

if (cmd === 'test') {
  const { startVitest } = await import('vitest/node')
  const vitest = await startVitest('test', [], { root: klappeDir, run: true, project: ['e2e'] })
  await vitest?.close()
  process.exit(vitest && vitest.state.getCountOfFailedTests() === 0 && !vitest.state.getUnhandledErrors().length ? 0 : 1)
}

const configFile = path.join(klappeDir, 'vite.config.ts')

if (cmd === 'build') {
  await build({ configFile })
} else {
  const server = await createServer({ configFile })
  await server.listen()
  server.printUrls()
}
