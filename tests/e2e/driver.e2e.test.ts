import { expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

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
