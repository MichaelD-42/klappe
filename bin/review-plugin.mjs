import fs from 'node:fs'
import path from 'node:path'
import { applyEdit, CATEGORIES, STEP_HASH as HASH } from '../src/review/file.ts'

// The review window's route, dev server only: GET returns review.md, POST applies one step's changed findings.
const ROUTE = '/__klappe/review'
const TEXT_ROUTE = '/__klappe/text'
const MAX_TEXT = 20_000 // characters in one finding or quote
const MAX_STEPS = 10_000
const MAX_BODY = 2_000_000 // bytes

// One edit from a POST body ({ hash, quote, set, approve?, reopen?, order, from?, seq? }), or null when it is not one.
// from names the review window, seq numbers its saves: see fresh().
export function readEdit(body) {
  if (!body || typeof body !== 'object') return null
  const { hash, quote, set, approve, reopen, order, from, seq } = body
  const text = (v) => typeof v === 'string' && v.length <= MAX_TEXT
  const texts = (o) => !!o && typeof o === 'object' && !Array.isArray(o) && Object.entries(o).every(([k, v]) => CATEGORIES.includes(k) && text(v))
  if (typeof hash !== 'string' || !HASH.test(hash) || !text(quote)) return null
  if (!texts(set)) return null
  if (approve !== undefined && !(Array.isArray(approve) && approve.every((k) => CATEGORIES.includes(k)))) return null
  if (reopen !== undefined && !texts(reopen)) return null
  if (!Array.isArray(order) || order.length > MAX_STEPS || !order.every((h) => typeof h === 'string' && HASH.test(h))) return null
  if (from !== undefined && (typeof from !== 'string' || from.length > 64)) return null
  if (seq !== undefined && !(Number.isSafeInteger(seq) && seq >= 0)) return null
  return { edit: { hash, quote, set, approve, reopen }, order, from, seq }
}

// The edit without the categories a newer save from the same window already set on that step: a closing window
// sends its last saves at once, beside one still in flight, and they can land in any order.
export function fresh(seen, from, seq, edit) {
  if (from === undefined || seq === undefined) return edit
  const set = {}
  for (const [k, v] of Object.entries(edit.set)) {
    const key = `${from}|${edit.hash}|${k}`
    if ((seen.get(key) ?? -1) >= seq) continue
    seen.set(key, seq)
    set[k] = v
  }
  return { ...edit, set }
}

// A text edit from a POST body ({ source, from, to }): a scene.md inside sections/, one line of new text. Or null.
const SOURCE = /^sections\/[^/\\]+\/[^/\\]+\/scene\.md$/
export function readText(body) {
  if (!body || typeof body !== 'object') return null
  const { source, from, to } = body
  const line = (v) => typeof v === 'string' && v.length <= MAX_TEXT && !/[\r\n]/.test(v)
  if (typeof source !== 'string' || !SOURCE.test(source) || source.split('/').includes('..') || !line(from) || !line(to)) return null
  return { source, from, to }
}

// scene.md with the one line that shows `from` (a list item, a task, the ## title or a ### question) showing `to`,
// or null: the text is on no line or on several (a step with a link shows its label, not its line), or `to` is empty.
export function replaceText(md, from, to) {
  if (!to.trim() || /[\r\n]/.test(to)) return null
  const lines = md.split('\n')
  const hit = lines.flatMap((l, i) => {
    const m = /^(\s*(?:[-*] (?:\[[ xX!]\] )?|#{2,3} ))(.*?)\s*$/.exec(l)
    return m && m[2] === from ? [{ i, lead: m[1] }] : []
  })
  if (hit.length !== 1) return null
  lines[hit[0].i] = hit[0].lead + to.trim()
  return lines.join('\n')
}

// Only the deck's own pages may write: any page the author visits can reach localhost.
const sameOrigin = (origin, host) => {
  if (!origin) return true // not a browser's cross-origin request
  try {
    return new URL(origin).host === host
  } catch {
    return false // "null": a sandboxed frame or a file: page
  }
}

// file: review.md. deckDir: where text edits write scene.md (the e2e tests point it at a temp folder).
export function klappeReview({ file, deckDir }) {
  const rel = path.relative(process.cwd(), file) || file
  const seen = new Map() // window|step|category → the newest save number applied
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
      // The deck window's text edits: one line of a scene.md, written straight back. Vite then reloads the deck.
      server.middlewares.use(TEXT_ROUTE, (req, res) => {
        if (!sameOrigin(req.headers.origin, req.headers.host)) return send(res, 403, { error: 'other origin' })
        if (req.method !== 'POST' || !deckDir) return send(res, 405, { error: 'POST' })
        const chunks = []
        let size = 0
        req.on('data', (c) => ((size += c.length) <= MAX_BODY ? chunks.push(c) : req.destroy()))
        req.on('end', () => {
          let t = null
          try {
            t = readText(JSON.parse(Buffer.concat(chunks).toString('utf8')))
          } catch {}
          if (!t) return send(res, 400, { error: 'not a text edit' })
          const at = path.join(deckDir, t.source)
          if (!fs.existsSync(at)) return send(res, 404, { error: `no ${t.source}` })
          const md = replaceText(fs.readFileSync(at, 'utf8'), t.from, t.to)
          if (md === null) return send(res, 409, { error: 'the text is not on exactly one line' })
          fs.writeFileSync(at, md)
          send(res, 200, { source: t.source })
        })
      })
      server.middlewares.use(ROUTE, (req, res) => {
        if (!sameOrigin(req.headers.origin, req.headers.host)) return send(res, 403, { error: 'other origin' })
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
          const text = applyEdit(read(), fresh(seen, parsed.from, parsed.seq, parsed.edit), parsed.order)
          fs.mkdirSync(path.dirname(file), { recursive: true })
          fs.writeFileSync(file, text)
          send(res, 200, { path: rel, text })
        })
      })
    },
  }
}
