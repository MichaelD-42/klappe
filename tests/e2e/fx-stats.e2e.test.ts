import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek and the numbers are legible at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-stats`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  }, 120_000)

test('each stat ends on its number; the change is coloured by whether it is good; sources reach the notes', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-stats#/a/all/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(500)
  const r = await page.evaluate(() => {
    const css = (v: string) => {
      const p = Object.assign(document.createElement('div'), { style: `color: var(${v})` })
      document.body.append(p)
      return getComputedStyle(p).color
    }
    const kpis = [...document.querySelectorAll<HTMLElement>('[data-k-kpi]')].map((k) => {
      const badge = k.querySelector<HTMLElement>('[data-good]')!
      const line = k.querySelector('path')!
      return { text: k.querySelector('[data-k-text]')!.textContent, badge: badge.textContent, badgeColor: getComputedStyle(badge).color, drawn: parseFloat(getComputedStyle(line).strokeDashoffset) === 0, note: k.dataset.kNote }
    })
    const waffle = document.querySelector<HTMLElement>('[data-k-waffle]')!
    const lit = [...waffle.querySelectorAll('rect')].filter((r) => getComputedStyle(r).fill === css('--k-accent') && getComputedStyle(r).visibility === 'visible').length
    const rings = [...document.querySelectorAll<HTMLElement>('[data-k-progress]')].map((p) => ({
      text: p.querySelector('[data-k-text]')!.textContent,
      color: getComputedStyle(p.querySelectorAll('circle')[1]).stroke,
    }))
    return { kpis, lit, waffle: waffle.querySelector('[data-k-text]')!.textContent, rings, ok: css('--k-ok'), bad: css('--k-bad'), accent: css('--k-accent') }
  })
  expect(r.kpis[0]).toMatchObject({ text: '1,284', badge: '▲ 12 %', badgeColor: r.ok, drawn: true, note: 'Source: klappe demo sample' })
  expect(r.kpis[1]).toMatchObject({ text: '14.5', badge: '▲ 16 %', badgeColor: r.bad, drawn: true, note: 'Source: origin not stated' })
  expect([r.lit, r.waffle]).toEqual([37, '37 %'])
  expect(r.rings).toEqual([{ text: '72 %', color: r.accent }, { text: '108 %', color: r.ok }])
  await page.close()
}, 60_000)

test('a number and its unit stay on one line, and the waffle share too', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-stats#/a/all/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(500)
  // Each number is one line box, and a KPI's unit sits on the number's line. A label may wrap: how far
  // depends on the font (CI's is wider), so only the numbers are checked.
  // The number's own height in its own line heights (a flex item is one box however its text wraps).
  const lines = await page.evaluate(() => {
    const k = document.querySelector('.k-stage')!.getBoundingClientRect().width / 1920
    return [...document.querySelectorAll<HTMLElement>('[data-k-kpi] [data-k-text], [data-k-waffle] [data-k-text]')].map((e) => {
      const n = e.getBoundingClientRect()
      const unit = e.closest('[data-k-kpi]') ? e.nextElementSibling?.getBoundingClientRect() : undefined
      const sameLine = !unit || (unit.top >= n.top - 1 && unit.bottom <= n.bottom + 1)
      return sameLine ? Math.round(n.height / (parseFloat(getComputedStyle(e).lineHeight) * k)) : 2
    })
  })
  expect(lines).toEqual([1, 1, 1])
  await page.close()
})
