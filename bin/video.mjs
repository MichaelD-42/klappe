import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'
import { openDeck } from './pdf.mjs'

// Renders the deck at url to the MP4 out: each step plays as it does live, camera flights and transitions included,
// but every frame is a seek of GSAP's root timeline to the frame's time, so the video is the same each run. Then the
// step's last frame holds for its auto time, else hold seconds. Frames go to the system ffmpeg as JPEGs on stdin.
// Returns the frame count and the deck problems and page errors, for the terminal. ffmpeg writes <out>.part.mp4, renamed
// onto out once it exits cleanly: a failure or an abort (signal, as on Ctrl-C) leaves an earlier export as it was.
export async function exportVideo(url, out, { fps = 30, hold = 3, size = { width: 1920, height: 1080 }, signal } = {}) {
  fs.mkdirSync(path.dirname(out), { recursive: true })
  const part = `${out}.part.mp4`
  // The scale filter evens the size: yuv420p needs it, and a 4:3 frame at an odd width gives an odd height.
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(fps), part], { stdio: ['pipe', 'ignore', 'pipe'] })
  let stderr = ''
  ff.stderr.on('data', (d) => (stderr += d))
  const exited = new Promise((resolve, reject) => {
    ff.on('error', reject)
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr.trim()}`))))
  })
  exited.catch(() => {}) // awaited at the end; a write to a dead ffmpeg ends there too
  ff.stdin.on('error', () => {}) // EPIPE when ffmpeg quits early: its exit code and stderr say why
  const write = (buf) => ff.stdin.write(buf) || Promise.race([new Promise((r) => ff.stdin.once('drain', r)), exited])
  let browser
  const abort = () => (ff.kill('SIGKILL'), browser?.close().catch(() => {})) // the step in flight then throws, into the catch
  signal?.addEventListener('abort', abort)
  let frames = 0
  try {
    browser = await chromium.launch()
    signal?.throwIfAborted()
    // Full motion and plays, not openDeck's cuts; ?selftest= (empty) holds the backgrounds still, as in the walk,
    // without running a self-test.
    const page = await openDeck(browser, url, size, { instant: '0', reducedmotion: '0', selftest: '' })
    const steps = await page.evaluate(() => {
      const g = window.klappe.gsap
      g.globalTimeline.pause() // the frame loop below sets its time
      g.ticker.lagSmoothing(1e-6, 1e-6) // the ticker's own clock stands still: mesh3d and its kind hold their pose
      return window.klappe.steps
    })
    // The step's play as it stood t seconds in, with the wall-clock loops held still: CSS and Web Animations at their
    // start, videos paused.
    const seek = (t) =>
      page.evaluate(async (t) => {
        const g = window.klappe.gsap
        g.globalTimeline.totalTime(window.__kVideo.t0 + t)
        g.ticker.tick() // draws the ticker's canvases (mesh3d) at their held pose
        for (const a of document.getAnimations()) if (!(a instanceof CSSTransition)) a.pause(), (a.currentTime = 0)
        for (const v of document.querySelectorAll('video')) v.pause()
        await new Promise((r) => setTimeout(r)) // the play's promise chain settles first
      }, t)
    const shot = () => page.screenshot({ type: 'jpeg', quality: 90 })
    // at: the video time the step starts, exact. Frame n shows time n / fps, so rounding does not add up over the steps.
    let at = 0
    for (const s of steps) {
      // Step 0 plays its canvas from the start; later steps play through the stepper, with their transition.
      // Returns the play's length: its tweens' end on the root timeline.
      const d = await page.evaluate(async (i) => {
        const k = window.klappe
        const run = (window.__kVideo = { t0: k.gsap.globalTimeline.time() })
        const c = k.canvases[k.steps[i].canvas]
        const play = i === 0 ? (c.tl.seek(0, false), c.tl.tweenFromTo(0, 'e:0')) : k.stepper.goto(i, 'play')
        run.done = play.then(() => k.stepper.cancelAuto()) // this loop holds and advances, not the auto timer
        await new Promise((r) => setTimeout(r)) // the stepper starts the move a few microtasks on
        await document.fonts.ready
        await Promise.all([...document.images].map((im) => im.decode().catch(() => {})))
        const anims = i === 0 ? [play] : k.stepper.running // private in TypeScript; the move's transition and play
        return Math.max(0, ...anims.map((a) => a.endTime() - run.t0))
      }, s.index)
      const auto = typeof s.auto === 'number' && Number.isFinite(s.auto) && s.auto >= 0 ? s.auto : hold
      for (; frames / fps < at + d; frames++) {
        await seek(frames / fps - at)
        await write(await shot())
      }
      await seek(d + 1e-6) // 1 µs past the end: float noise must not leave a tween a hair short of it
      await page.evaluate(() => window.__kVideo.done)
      const last = await shot()
      for (; frames / fps < at + d + auto; frames++) await write(last)
      at += d + auto
    }
    const { problems, errors } = await page.evaluate(() => ({ problems: [...window.klappe.problems], errors: [...window.klappe.errors] }))
    ff.stdin.end()
    await exited
    fs.renameSync(part, out)
    return { frames, problems, errors }
  } catch (e) {
    ff.kill('SIGKILL')
    await exited.catch(() => {})
    fs.rmSync(part, { force: true })
    throw signal?.aborted ? new Error(`interrupted; ${out} is unchanged`) : e
  } finally {
    signal?.removeEventListener('abort', abort)
    await browser?.close()
  }
}
