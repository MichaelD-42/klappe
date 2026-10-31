import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, inject, test } from 'vitest'
import { exportVideo } from '../../bin/video.mjs'

const missing = ['ffmpeg', 'ffprobe'].filter((c) => spawnSync(c, ['-version']).error)
if (missing.length) console.warn(`video export test skipped: ${missing.join(' and ')} not on PATH`)

// The video fixture: a's step plays 0.5 s and holds 1 s (its auto); the blackout into b takes 1.1 s, then b's step
// plays 0.5 s and holds --hold. Each step's play starts 1 ms in (the canvas timeline's "step" label). Every frame is a
// seek on one clock for the whole video, so the length is right to the frame.
test.skipIf(missing.length)('video renders each step by seeking, holds it, and encodes H.264 at the size', async () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'klappe-video-')), 'deck.mp4')
  try {
    const fps = 10
    const r = await exportVideo(`${inject('BASE_URL')}/?fixture=video`, out, { fps, hold: 0.5, size: { width: 320, height: 180 } })
    expect(r.errors).toEqual([])
    const probe = JSON.parse(
      execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height,codec_name,pix_fmt,nb_frames:format=duration', '-of', 'json', out], { encoding: 'utf8' }),
    )
    expect(probe.streams[0]).toMatchObject({ codec_name: 'h264', pix_fmt: 'yuv420p', width: 320, height: 180 })
    const want = 0.502 + 1 + 1.1 + 0.502 + 0.5
    expect(Math.abs(Number(probe.format.duration) - want)).toBeLessThanOrEqual(1 / fps + 1e-3)
  } finally {
    fs.rmSync(path.dirname(out), { recursive: true })
  }
})

// An export stopped mid-render (Ctrl-C aborts the same way) leaves the earlier file as it was, and no partial one.
test.skipIf(missing.length)('an aborted video leaves the earlier export and no partial file', async () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'klappe-video-')), 'deck.mp4')
  fs.writeFileSync(out, 'earlier export')
  const stop = new AbortController()
  // Abort once ffmpeg has written the partial file: the render is under way. A long hold keeps it going.
  const watch = setInterval(() => fs.existsSync(`${out}.part.mp4`) && stop.abort(), 20)
  try {
    const r = exportVideo(`${inject('BASE_URL')}/?fixture=video`, out, { fps: 10, hold: 600, size: { width: 320, height: 180 }, signal: stop.signal })
    await expect(r).rejects.toThrow('interrupted')
    expect(stop.signal.aborted).toBe(true)
    expect(fs.readFileSync(out, 'utf8')).toBe('earlier export')
    expect(fs.readdirSync(path.dirname(out))).toEqual(['deck.mp4'])
  } finally {
    clearInterval(watch)
    fs.rmSync(path.dirname(out), { recursive: true })
  }
})

// The CLI checks for ffmpeg before it starts a server or a browser.
test('klappe video without ffmpeg on PATH names it and fails', () => {
  const r = spawnSync(process.execPath, [path.resolve('bin/klappe.mjs'), 'video', '--deck', 'demo'], { env: { PATH: '' }, encoding: 'utf8' })
  expect(r.status).toBe(1)
  expect(r.stderr).toContain('klappe video needs ffmpeg on PATH')
})
