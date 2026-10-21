import { expect, test } from 'vitest'
import { timerState } from '../../src/fx/timer'

test('a fresh 10 minute timer reads 10:00 and runs', () => {
  expect(timerState(600000, 0)).toEqual({ remainingMs: 600000, phase: 'run', text: '10:00' })
})

test('the last 20% is the warn phase', () => {
  expect(timerState(600000, 479999).phase).toBe('run')
  expect(timerState(600000, 480000).phase).toBe('warn')
  expect(timerState(600000, 480001).phase).toBe('warn')
})

test('at zero and past it the timer is done at 0:00', () => {
  expect(timerState(600000, 600000)).toMatchObject({ phase: 'done', text: '0:00' })
  expect(timerState(600000, 700000)).toEqual({ remainingMs: 0, phase: 'done', text: '0:00' })
})

test('seconds round up, so 0:00 shows only when the time is up', () => {
  expect(timerState(60000, 59001).text).toBe('0:01')
  expect(timerState(600000, 1).text).toBe('10:00')
  expect(timerState(600000, 1000).text).toBe('9:59')
})
