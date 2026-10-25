import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import * as fx from '../../src/fx'
import { ALLOW } from './fx-internal'

// The skill's "Choose the element by intent" table is how an agent finds an effect: every effect a deck can call
// has a row, and every link and catalog scene in it exists.
const root = fileURLToPath(new URL('../../', import.meta.url))
const skill = fs.readFileSync(path.join(root, '.claude/skills/klappe/SKILL.md'), 'utf8')
const table = /## Choose the element by intent\n[\s\S]*?\n(\|[\s\S]*?)\n\n/.exec(skill)![1]
const rows = table.split('\n').slice(2).map((r) => r.split(/(?<!\\)\|/).slice(1, -1))

// GitHub's heading anchor: lower case, punctuation dropped, spaces to dashes.
const slug = (h: string) => h.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s/g, '-')

test('the table has the four columns on every row', () => {
  expect(rows.length).toBeGreaterThan(40)
  expect(rows.filter((r) => r.length !== 4)).toEqual([])
})

test('every effect a deck can call has a row', () => {
  const used = new Set(rows.flatMap(([, use]) => [...use.matchAll(/`(\w+)`/g)].map((m) => m[1])))
  expect(Object.keys(fx).filter((n) => !ALLOW.includes(n) && !used.has(n))).toEqual([])
})

test('every reference link and anchor exists', () => {
  const broken = rows.flatMap(([, , ref]) =>
    [...ref.matchAll(/\]\(klappe\/([^)#]+)(?:#([^)]+))?\)/g)].filter(([, file, anchor]) => {
      const p = path.join(root, file)
      if (!fs.existsSync(p)) return true
      return anchor !== undefined && ![...fs.readFileSync(p, 'utf8').matchAll(/^#+\s+(.+)$/gm)].some((m) => slug(m[1]) === anchor)
    }).map((m) => m[0]),
  )
  expect(broken).toEqual([])
})

test('every catalog scene exists in the demo deck', () => {
  const scenes = rows.flatMap(([, , , cat]) => [...cat.matchAll(/`([^`]+)`/g)].map((m) => m[1]))
  expect(scenes.filter((s) => !fs.existsSync(path.join(root, 'decks/demo/sections', s, 'scene.md')))).toEqual([])
})
