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

// A deck that cannot load (a syntax error in a scene.ts) never publishes its steps: fail on its error, not after the wait.
test('a page that errors before the deck loads fails within seconds, with the error', async () => {
  const t0 = Date.now()
  await expect(runSelftest(`data:text/html,<script>throw new Error("scene.ts: Unexpected token")</script>`)).rejects.toThrow('scene.ts: Unexpected token')
  expect(Date.now() - t0).toBeLessThan(20_000)
}, 60_000)
