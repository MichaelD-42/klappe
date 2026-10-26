import fs from 'node:fs'
import path from 'node:path'
import { applyEdit, CATEGORIES, STEP_HASH as HASH } from '../src/review/file.ts'

// The review window's route, dev server only: GET returns review.md, POST applies one step's changed findings.
const ROUTE = '/__klappe/review'
const MAX_TEXT = 20_000 // characters in one finding or quote
const MAX_STEPS = 10_000
const MAX_BODY = 2_000_000 // bytes

// One edit from a POST body ({ hash, quote, set, order }), or null when it is not one.
export function readEdit(body) {
  if (!body || typeof body !== 'object') return null
  const { hash, quote, set, order } = body
  const text = (v) => typeof v === 'string' && v.length <= MAX_TEXT
  if (typeof hash !== 'string' || !HASH.test(hash) || !text(quote)) return null
  if (!set || typeof set !== 'object' || !Object.entries(set).every(([k, v]) => CATEGORIES.includes(k) && text(v))) return null
  if (!Array.isArray(order) || order.length > MAX_STEPS || !order.every((h) => typeof h === 'string' && HASH.test(h))) return null
  return { edit: { hash, quote, set }, order }
}

export function klappeReview({ file }) {
  const rel = path.relative(process.cwd(), file) || file
  const read = () => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '')
  const send = (res, status, json) => {
    res.statusCode = status
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(json))
  }
  return {
    name: 'klappe-review',
    apply: 'serve',
    // The page asks this, not import.meta.env.DEV: review mode exists exactly where its route does.
    config: () => ({ define: { 'import.meta.env.KLAPPE_REVIEW': 'true' } }),
    configureServer(server) {
      server.middlewares.use(ROUTE, (req, res) => {
        // Any page the author visits can reach localhost: only the deck's own pages may use this.
        const origin = req.headers.origin
        if (origin && new URL(origin).host !== req.headers.host) return send(res, 403, { error: 'other origin' })
        if (req.method === 'GET') return send(res, 200, { path: rel, text: read() })
        if (req.method !== 'POST') return send(res, 405, { error: 'GET or POST' })
        let size = 0
        const chunks = []
        req.on('data', (c) => ((size += c.length) <= MAX_BODY ? chunks.push(c) : req.destroy()))
        req.on('end', () => {
          let parsed = null
          try {
            parsed = readEdit(JSON.parse(Buffer.concat(chunks).toString('utf8')))
          } catch {}
          if (!parsed) return send(res, 400, { error: 'not a review edit' })
          // Read, change and write in one go, so two saves never interleave.
          const text = applyEdit(read(), parsed.edit, parsed.order)
          fs.mkdirSync(path.dirname(file), { recursive: true })
          fs.writeFileSync(file, text)
          send(res, 200, { path: rel, text })
        })
      })
    },
  }
}
