#!/usr/bin/env node
import { createServer, build } from 'vite'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

const klappeDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [cmd, ...rest] = process.argv.slice(2)
const i = rest.indexOf('--deck')
const decksDir = path.join(process.cwd(), 'decks')

if (cmd !== 'dev' && cmd !== 'build') {
  console.error('usage: klappe dev|build [--deck <id>]')
  process.exit(1)
}

let id = i >= 0 ? rest[i + 1] : undefined
if (i >= 0 && !id) {
  console.error('--deck needs an id')
  process.exit(1)
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
const configFile = path.join(klappeDir, 'vite.config.ts')

if (cmd === 'build') {
  await build({ configFile })
} else {
  const server = await createServer({ configFile })
  await server.listen()
  server.printUrls()
}
