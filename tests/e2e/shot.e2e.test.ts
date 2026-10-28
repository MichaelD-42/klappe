import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, inject, test } from 'vitest'
import { shoot } from '../../bin/shot.mjs'

// A PNG's width and height sit in its IHDR chunk.
const size = (file: string) => {
  const b = fs.readFileSync(file)
  return [b.readUInt32BE(16), b.readUInt32BE(20)]
}

test('shot writes each picked step at both sizes, and a contact sheet per section', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'klappe-shot-'))
  try {
    // two-scenes: section a, scenes first (5 steps) and second (2 steps).
    const r = await shoot(`${inject('BASE_URL')}/?fixture=two-scenes`, out, { targets: ['a/first/2', 'a/second'], sheet: true })
    expect(r.unknown).toEqual([])
    expect(r.errors).toEqual([])
    const rel = r.files.map((f) => path.relative(out, f))
    expect(rel).toEqual(['1920x1080', '1366x768'].flatMap((d) => ['a.first.2', 'a.second.1', 'a.second.2'].map((n) => path.join(d, `${n}.png`))))
    expect(size(path.join(out, '1920x1080', 'a.first.2.png'))).toEqual([1920, 1080])
    expect(size(path.join(out, '1366x768', 'a.second.2.png'))).toEqual([1366, 768])
    // Only a.second's last step was picked, so the sheet has one cell.
    expect(r.sheets.map((f) => path.relative(out, f))).toEqual(['sheet-a.png'])
    expect(size(r.sheets[0])[0]).toBeGreaterThan(480)
  } finally {
    fs.rmSync(out, { recursive: true })
  }
})

test('shot with sizes and at shoots one size, mid-play', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'klappe-shot-'))
  try {
    const url = `${inject('BASE_URL')}/?fixture=two-scenes`
    const sizes = [{ width: 1366, height: 768 }]
    const end = await shoot(url, out, { targets: ['a/first/2'], sizes })
    const mid = await shoot(url, out, { targets: ['a/first/2'], sizes, at: 0 })
    expect([...end.files, ...mid.files].map((f) => path.relative(out, f))).toEqual(
      ['a.first.2.png', 'a.first.2@0ms.png'].map((n) => path.join('1366x768', n)),
    )
    // At 0 ms step 2 has not drawn yet, so the picture differs from its end.
    expect(fs.readFileSync(mid.files[0]).equals(fs.readFileSync(end.files[0]))).toBe(false)
  } finally {
    fs.rmSync(out, { recursive: true })
  }
})

test('shot names a target that matches no step and writes nothing', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'klappe-shot-'))
  try {
    const r = await shoot(`${inject('BASE_URL')}/?fixture=two-scenes`, out, { targets: ['a/third'] })
    expect(r.unknown).toEqual(['a/third'])
    expect(r.files).toEqual([])
  } finally {
    fs.rmSync(out, { recursive: true })
  }
})
