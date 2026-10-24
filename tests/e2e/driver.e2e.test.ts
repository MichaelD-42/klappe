import { expect, inject, test } from 'vitest'
import { runSelftest, selftestTimeout } from './driver'

const payload = '{"mode":"x","ok":true,"steps":0,"checks":[],"problems":[],"errors":[]}'

test('driver reads the selftest result from a page', async () => {
  const r = await runSelftest(`data:text/html,<script id="klappe-selftest" type="application/json">${payload}</script>`)
  expect(r.ok).toBe(true)
})

test('dev server is reachable', () => {
  expect(inject('BASE_URL')).toMatch(/^http:\/\//)
})

test('an empty result names the cause instead of a bare SyntaxError', async () => {
  await expect(runSelftest(`data:text/html,<script id="klappe-selftest" type="application/json"></script>`)).rejects.toThrow(
    'the self-test wrote an empty result',
  )
})

// A big deck gets more time; a small one keeps the 110 s wait (the ac worst case).
test('the selftest wait grows with the step count', () => {
  expect(selftestTimeout(0)).toBe(110_000)
  expect(selftestTimeout(10)).toBeLessThan(115_000)
  expect(selftestTimeout(644)).toBeGreaterThan(200_000)
})
