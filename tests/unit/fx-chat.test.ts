import { expect, test } from 'vitest'
import { chatMessage } from '../../src/fx/chat'

test('a "name: " prefix names the sender; a line without one is the assistant', () => {
  expect(chatMessage('user: Hi there')).toEqual({ from: 'user', text: 'Hi there' })
  expect(chatMessage('Ana Lima: See you at 10:30')).toEqual({ from: 'Ana Lima', text: 'See you at 10:30' })
  expect(chatMessage('Run npm ci, then npm test.')).toEqual({ from: 'assistant', text: 'Run npm ci, then npm test.' })
})

// A long lead-in before a colon is text, not a name; a short one needs the "assistant: " prefix.
test('a name is at most 24 characters', () => {
  expect(chatMessage('Start with the three that block: tests').from).toBe('assistant') // 31 characters
  expect(chatMessage('assistant: Note: it is late')).toEqual({ from: 'assistant', text: 'Note: it is late' })
})

// A colon without a space after it (a time, a URL) is not a prefix.
test('a colon inside the text is not a prefix', () => {
  expect(chatMessage('10:30 works')).toEqual({ from: 'assistant', text: '10:30 works' })
  expect(chatMessage('https://example.com is up')).toEqual({ from: 'assistant', text: 'https://example.com is up' })
})
