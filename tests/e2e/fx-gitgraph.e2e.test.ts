import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-gitgraph`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['sections/10-a/20-all/scene.ts step 2: gitGraph: next() after the last op'])
  }, 120_000)

// After the rebase the originals are gone and their copies sit on the feature lane past main's tip; the merge lands on main.
test('a rebase moves the branch past the target tip, and the merge joins it on main', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const at = async (step: number) => {
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-gitgraph#/a/steps/${step}`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await settle(page)
    return page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll<HTMLElement>('[data-scene="steps"] [data-k-git-commit]')].map((e) => {
          const b = e.getBoundingClientRect()
          return [e.textContent, { x: b.x, y: b.y, on: getComputedStyle(e).visibility === 'visible' && +getComputedStyle(e).opacity > 0.9 }]
        }),
      ),
    )
  }
  const before = await at(5)
  expect([before.form.on, before.tests.on, before['form′'].on]).toEqual([true, true, false])
  const after = await at(6)
  expect([after.form.on, after.tests.on, after['form′'].on, after['tests′'].on]).toEqual([false, false, true, true])
  expect(after['form′'].x).toBeGreaterThan(after.hotfix.x)
  expect(after['form′'].y).toBeCloseTo(before.form.y, 0)
  const merged = await at(7)
  expect(merged['merge feature']).toMatchObject({ on: true, y: merged.hotfix.y })
  expect(merged['merge feature'].x).toBeGreaterThan(merged['tests′'].x)
  await page.close()
}, 60_000)

// A tag sits over the commit it marks; a cherry-pick's copy lands on the target lane past its tip, the original stays.
test('tags sit over their commits; a cherry-pick copies the commit onto main and keeps the original', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const at = async (step: number) => {
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-gitgraph#/a/pick/${step}`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await settle(page)
    return page.evaluate(() => {
      const shows = (e: Element) => getComputedStyle(e).visibility === 'visible' && +getComputedStyle(e).opacity > 0.9
      const mid = (e: Element) => {
        const b = e.getBoundingClientRect()
        return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
      }
      const commits = Object.fromEntries(
        [...document.querySelectorAll<HTMLElement>('[data-scene="pick"] [data-k-git-commit]')].map((e) => [e.textContent, { ...mid(e.firstElementChild!), on: shows(e) }]),
      )
      const tags = Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-scene="pick"] [data-k-git-tag]')].filter(shows).map((e) => [e.textContent, mid(e)]))
      return { commits, tags }
    })
  }
  let s = await at(2)
  expect(Object.keys(s.tags)).toEqual(['v1.0'])
  expect(s.tags['v1.0'].x).toBeCloseTo(s.commits.init.x, 0)
  expect(s.tags['v1.0'].y).toBeLessThan(s.commits.init.y)
  s = await at(7)
  expect(Object.keys(s.tags).sort()).toEqual(['v1.0', 'v1.0.1'])
  expect(s.commits.hotfix.on).toBe(true)
  expect(s.commits['hotfix′']).toMatchObject({ on: true, y: s.commits.feature.y })
  expect(s.commits['hotfix′'].x).toBeGreaterThan(s.commits.hotfix.x)
  await page.close()
}, 60_000)

// Two tags on one commit stack instead of covering each other; HEAD sits over the commit it points at, above its tags.
test('tags on one commit stack, and HEAD follows the checked-out tip', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const at = async (step: number) => {
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-gitgraph#/a/head/${step}`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await settle(page)
    return page.evaluate(() => {
      const shows = (e: Element) => getComputedStyle(e).visibility === 'visible' && +getComputedStyle(e).opacity > 0.9
      const box = (e: Element) => {
        const b = e.getBoundingClientRect()
        return { x: b.x + b.width / 2, top: b.top, bottom: b.bottom }
      }
      const root = document.querySelector('div[data-scene="head"]')!
      const commits = Object.fromEntries([...root.querySelectorAll<HTMLElement>('[data-k-git-commit]')].filter(shows).map((e) => [e.textContent, box(e.firstElementChild!)]))
      const tags = Object.fromEntries([...root.querySelectorAll<HTMLElement>('[data-k-git-tag]')].filter(shows).map((e) => [e.textContent, box(e)]))
      const h = root.querySelector('[data-k-git-head]')
      return { commits, tags, head: h && shows(h) ? box(h) : null }
    })
  }
  let s = await at(3)
  expect(s.tags.lts.bottom).toBeLessThanOrEqual(s.tags['v1.0'].top)
  expect(s.head).toBeNull()
  s = await at(4)
  expect(s.head!.x).toBeCloseTo(s.commits.init.x, 0)
  expect(s.head!.bottom).toBeLessThanOrEqual(s.tags.lts.top)
  s = await at(7)
  expect(s.head!.x).toBeCloseTo(s.commits.work.x, 0)
  expect(s.head!.bottom).toBeLessThanOrEqual(s.commits.work.top)
  await page.close()
}, 60_000)
