import { expect, test } from 'vitest'
import { scribble } from '../../src/fx/annotate'
import { contrast, parseTokens } from '../../src/theme'

const box = { x: 400, y: 300, w: 240, h: 60 }
const PAD = 12
type P = { x: number; y: number }

// Ray casting: is p inside the closed polygon pts?
function inside(p: P, pts: P[]) {
  let c = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
    if (pts[i].y > p.y !== pts[j].y > p.y && p.x < ((pts[j].x - pts[i].x) * (p.y - pts[i].y)) / (pts[j].y - pts[i].y) + pts[i].x) c = !c
  return c
}
const corners = [
  { x: box.x, y: box.y },
  { x: box.x + box.w, y: box.y },
  { x: box.x, y: box.y + box.h },
  { x: box.x + box.w, y: box.y + box.h },
]
const xs = (pts: P[]) => pts.map((p) => p.x)
const ys = (pts: P[]) => pts.map((p) => p.y)

test('a circle goes once round the whole box and a bit more, clear of it', () => {
  const [ring] = scribble('circle', box, { pad: PAD, seed: 1 })
  for (const c of corners) expect(inside(c, ring)).toBe(true)
  for (const p of ring) expect(inside(p, corners.slice(0, 2).concat(corners[3], corners[2]))).toBe(false)
  // The end overshoots the start: more than one turn round the centre.
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  let turn = 0
  for (let i = 1; i < ring.length; i++) {
    let d = Math.atan2(ring[i].y - cy, ring[i].x - cx) - Math.atan2(ring[i - 1].y - cy, ring[i - 1].x - cx)
    if (d > Math.PI) d -= 2 * Math.PI
    if (d < -Math.PI) d += 2 * Math.PI
    turn += d
  }
  expect(Math.abs(turn)).toBeGreaterThan(2 * Math.PI)
  expect(Math.abs(turn)).toBeLessThan(3 * Math.PI) // an overshoot, not a second loop
})

// Around a wide, flat line the ring stays close at the ends, not stretched by a fixed factor.
test('a circle round a wide line keeps an even margin, about the line height at the ends', () => {
  const line = { x: 100, y: 100, w: 1200, h: 60 }
  const [ring] = scribble('circle', line, { pad: PAD, seed: 1 })
  const reach = Math.max(...ring.map((p) => Math.abs(p.x - (line.x + line.w / 2))))
  expect(reach).toBeLessThan(line.w / 2 + PAD + 2 * line.h)
})

test('an underline runs under the whole box', () => {
  const [line] = scribble('underline', box, { pad: PAD, seed: 1 })
  expect(Math.min(...ys(line))).toBeGreaterThan(box.y + box.h)
  expect(Math.max(...ys(line))).toBeLessThan(box.y + box.h + 3 * PAD)
  expect(Math.min(...xs(line))).toBeLessThanOrEqual(box.x)
  expect(Math.max(...xs(line))).toBeGreaterThanOrEqual(box.x + box.w)
})

test('a box frames the box on all four sides', () => {
  const [frame] = scribble('box', box, { pad: PAD, seed: 1 })
  for (const c of corners) expect(inside(c, frame)).toBe(true)
  expect(Math.min(...xs(frame))).toBeGreaterThan(box.x - 3 * PAD)
  expect(Math.max(...ys(frame))).toBeLessThan(box.y + box.h + 3 * PAD)
})

test('a strike crosses the box through its middle band, end to end', () => {
  const [line] = scribble('strike', box, { pad: PAD, seed: 1 })
  for (const y of ys(line)) expect(Math.abs(y - (box.y + box.h / 2))).toBeLessThan(box.h / 4)
  expect(Math.min(...xs(line))).toBeLessThanOrEqual(box.x)
  expect(Math.max(...xs(line))).toBeGreaterThanOrEqual(box.x + box.w)
})

test('an arrow comes from its side and ends at the box edge, with a two-stroke head there', () => {
  for (const [side, edge] of [
    ['left', { x: box.x - PAD, y: box.y + box.h / 2 }],
    ['right', { x: box.x + box.w + PAD, y: box.y + box.h / 2 }],
    ['top', { x: box.x + box.w / 2, y: box.y - PAD }],
    ['bottom', { x: box.x + box.w / 2, y: box.y + box.h + PAD }],
  ] as const) {
    const [shaft, ...head] = scribble('arrow', box, { pad: PAD, seed: 1, side })
    const end = shaft[shaft.length - 1]
    expect(Math.hypot(end.x - edge.x, end.y - edge.y)).toBeLessThan(1)
    expect(Math.hypot(shaft[0].x - edge.x, shaft[0].y - edge.y)).toBeGreaterThan(100)
    expect(head).toHaveLength(2)
    for (const h of head) expect(Math.hypot(h[h.length - 1].x - end.x, h[h.length - 1].y - end.y)).toBeLessThan(1)
  }
})

test('the same seed draws the same stroke; another seed wobbles differently', () => {
  expect(scribble('circle', box, { pad: PAD, seed: 3 })).toEqual(scribble('circle', box, { pad: PAD, seed: 3 }))
  expect(scribble('circle', box, { pad: PAD, seed: 3 })).not.toEqual(scribble('circle', box, { pad: PAD, seed: 4 }))
})

test('a highlight runs level through the middle of the box, end to end', () => {
  const [band] = scribble('highlight', box, { pad: PAD, seed: 1 })
  for (const y of ys(band)) expect(Math.abs(y - (box.y + box.h / 2))).toBeLessThan(box.h / 8)
  expect(Math.min(...xs(band))).toBeLessThanOrEqual(box.x)
  expect(Math.max(...xs(band))).toBeGreaterThanOrEqual(box.x + box.w)
})

// The band is --k-accent at 35 % over the stage (color-mix in srgb): text on it must keep the 4.5:1 floor.
const themes = import.meta.glob<string>('../../src/themes/*.css', { query: '?raw', import: 'default', eager: true })
test.each(Object.entries(themes))('--k-fg stays readable on a highlight in %s', (_, css) => {
  const t = parseTokens(css)
  const rgb = (h: string) => (h.length === 4 ? [...h.slice(1)].map((c) => c + c) : [h.slice(1, 3), h.slice(3, 5), h.slice(5, 7)]).map((c) => parseInt(c, 16))
  const [a, b] = [rgb(t['--k-accent']), rgb(t['--k-bg'])]
  const mix = `rgb(${a.map((v, i) => Math.round(v * 0.35 + b[i] * 0.65)).join(', ')})`
  expect(contrast(t['--k-fg'], mix)).toBeGreaterThanOrEqual(4.5)
})
