import { expect, test } from 'vitest'
import { splitConsole } from '../../src/fx/terminal'

test('commands take the output lines after them', () => {
  expect(splitConsole(['$ a', 'x', 'y', '$ b'])).toEqual([
    { cmd: 'a', out: ['x', 'y'] },
    { cmd: 'b', out: [] },
  ])
})

test('output before the first command is ignored', () => {
  expect(splitConsole(['stray', '$ a'])).toEqual([{ cmd: 'a', out: [] }])
  expect(splitConsole(['stray'])).toEqual([])
})
