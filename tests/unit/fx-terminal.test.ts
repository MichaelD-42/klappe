import { expect, test } from 'vitest'
import { splitConsole, wrapBreaks } from '../../src/fx/terminal'

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

// A row breaks after the last space or "/" that fits, so a long path splits between its parts, not mid-name.
test('wrap breaks after a space or a slash, mid-word only when neither fits', () => {
  const rows = (s: string, w: number) => [0, ...wrapBreaks(s, w)].map((b, i, a) => s.slice(b, a[i + 1]))
  expect(rows('cat /var/log/nginx/access.log', 16)).toEqual(['cat /var/log/', 'nginx/', 'access.log'])
  expect(rows('ls -la /usr/local/bin', 12)).toEqual(['ls -la /usr/', 'local/bin'])
  expect(rows('abcdefghijklmnop', 8)).toEqual(['abcdefgh', 'ijklmn', 'op'])
})
