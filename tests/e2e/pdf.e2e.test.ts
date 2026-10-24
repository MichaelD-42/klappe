import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, inject, test } from 'vitest'
import { exportPdf } from '../../bin/pdf.mjs'

// One page per step, and the deck problems come back for the terminal instead of covering a page.
test('the PDF has one page per step of the deck', async () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'klappe-pdf-')), 'deck.pdf')
  try {
    const r = await exportPdf(`${inject('BASE_URL')}/?fixture=fx-code`, out)
    expect(r.pages).toBe(13)
    expect(r.problems).toHaveLength(4)
    expect(r.errors).toEqual([])
    const pdf = fs.readFileSync(out, 'latin1')
    expect(pdf.startsWith('%PDF-')).toBe(true)
    expect(pdf.match(/\/Type\s*\/Page\b/g)).toHaveLength(13)
  } finally {
    fs.rmSync(path.dirname(out), { recursive: true })
  }
})
