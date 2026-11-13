import { expect, test } from 'vitest'
import { mmss } from '../../src/ui/clock'

test('talk times read m:ss, and h:mm:ss from an hour on', () => {
  expect([mmss(0), mmss(65), mmss(3599), mmss(3600), mmss(10_800), mmss(3725)]).toEqual(['0:00', '1:05', '59:59', '1:00:00', '3:00:00', '1:02:05'])
})
