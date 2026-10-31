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
    expect(r.pages).toBe(18)
    expect(r.problems).toHaveLength(6)
    expect(r.errors).toEqual([])
    const pdf = fs.readFileSync(out, 'latin1')
    expect(pdf.startsWith('%PDF-')).toBe(true)
    expect(pdf.match(/\/Type\s*\/Page\b/g)).toHaveLength(18)
  } finally {
    fs.rmSync(path.dirname(out), { recursive: true })
  }
})

// A handout: one page per scene, at its last step, with the speaker notes under the picture.
test('a handout has one page per scene', async () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'klappe-pdf-')), 'handout.pdf')
  try {
    const r = await exportPdf(`${inject('BASE_URL')}/?fixture=fx-code`, out, { handout: true })
    expect(r.pages).toBe(7)
    expect(r.errors).toEqual([])
    expect(fs.readFileSync(out, 'latin1').match(/\/Type\s*\/Page\b/g)).toHaveLength(7)
  } finally {
    fs.rmSync(path.dirname(out), { recursive: true })
  }
})

// A cut prints its own steps; the appendix prints last, after a page that names it.
test('the PDF of a cut has its steps, then a page that names the appendix and the appendix steps', async () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'klappe-pdf-')), 'cut.pdf')
  try {
    const r = await exportPdf(`${inject('BASE_URL')}/?fixture=cuts&cut=short`, out)
    expect(r.pages).toBe(6) // a/one 1-2, c/three 1, the appendix page, x/spare 1-2
    expect(r.problems).toEqual([])
    expect(fs.readFileSync(out, 'latin1').match(/\/Type\s*\/Page\b/g)).toHaveLength(6)
    const handout = await exportPdf(`${inject('BASE_URL')}/?fixture=cuts&cut=short`, out, { handout: true })
    expect(handout.pages).toBe(3)
  } finally {
    fs.rmSync(path.dirname(out), { recursive: true })
  }
})
