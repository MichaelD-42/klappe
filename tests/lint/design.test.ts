import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

// Design rules from the org brief: no italics in headings, no monospace outside .k-retro, no pill
// buttons, no "01/02" labels, no cream or off-white backgrounds, no runtime URLs in src.
type Rule = 'italic' | 'monospace' | 'pill-button' | 'numbered-label' | 'cream-background' | 'runtime-url'

const CREAM = String.raw`(?:#fff8e7|#faf3e0|#fdf6e3|#f5f5dc|\bivory\b|\bbeige\b|\blinen\b|\boldlace\b)`
const CREAM_BG = new RegExp(String.raw`(?:background(?:-color)?|backgroundColor|--[\w-]*bg[\w-]*)["']?\s*[:=]\s*[^;\n]*?` + CREAM, 'i')
// SVG and friends need these as namespace identifiers; nothing is fetched from them.
const XMLNS = new Set(['http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xlink', 'http://www.w3.org/1999/xhtml'])
// "01" as a label, but not inside a date, time or version ("2026-01-05", "09:30", "1.01").
const LABEL_NUM = /(?<![\d.:-])\b0[1-9]\b(?![.:-]\d)/

// Keeps "https://..." intact: a // comment needs no ':' right before it.
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const isPill = (radius: string) =>
  [...radius.matchAll(/(\d+(?:\.\d+)?)(px|%)/g)].some(([, n, u]) => (u === 'px' ? +n >= 999 : +n >= 50))
const cssRules = (css: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => ({ sel: sel.trim(), body }))
const stringLiterals = (ts: string) =>
  [...ts.replace(/\bfrom\s+["'][^"']*["']/g, '').matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)].map((m) => m[2])
const mdBody = (md: string) => md.replace(/^---\n[\s\S]*?\n---\n?/, '').replace(/^```[\s\S]*?^```/gm, '')
// User-visible label text in code: the strings table and UI code.
const isLabelCode = (p: string) => p === 'src/strings.ts' || /^src\/(ui|speaker)\//.test(p) || /^decks\/.*\.ts$/.test(p)

export function lint(file: string, raw: string): { rule: Rule; at: string }[] {
  const hits: { rule: Rule; at: string }[] = []
  const hit = (rule: Rule, at: string) => hits.push({ rule, at: `${file}: ${at.trim().slice(0, 80)}` })
  const ext = path.extname(file)
  const text = ext === '.md' ? raw : stripComments(raw)

  for (const m of text.matchAll(/font-?style["']?\s*[:=]\s*["']?italic/gi)) hit('italic', m[0])
  for (const m of text.matchAll(/<h([1-6])\b[^>]*>(?:(?!<\/h\1>)[\s\S])*?<(?:em|i)\b/gi)) hit('italic', m[0])
  if (ext === '.md')
    for (const [line, title] of mdBody(text).matchAll(/^#{1,6}\s+(.*)$/gm))
      if (/(?:^|[^\w*])[*_](?=\S)[^*_\n]*?\S[*_](?![\w*])/.test(title.replace(/\*\*|__/g, ''))) hit('italic', line)

  if (ext === '.css') {
    for (const { sel, body } of cssRules(text)) {
      if (/monospace/i.test(body) && !sel.includes('.k-retro')) hit('monospace', sel)
      const radius = body.match(/border-radius\s*:\s*([^;]+)/i)
      if (radius && /button|btn/i.test(sel) && isPill(radius[1])) hit('pill-button', `${sel} { ${radius[0]} }`)
    }
  } else
    for (const line of text.split('\n')) {
      if (/monospace/i.test(line) && !line.includes('k-retro')) hit('monospace', line)
      const radius = line.match(/border-?radius["']?\s*:\s*([^,;}\n]+)/i)
      if (radius && /button|btn/i.test(line) && isPill(radius[1])) hit('pill-button', line)
    }

  const labels = ext === '.md' ? [mdBody(text)] : ext === '.ts' && isLabelCode(file) ? stringLiterals(text) : []
  for (const l of labels) for (const line of l.split('\n')) if (LABEL_NUM.test(line)) hit('numbered-label', line)

  for (const line of text.split('\n')) if (CREAM_BG.test(line)) hit('cream-background', line)

  if (file.startsWith('src/'))
    for (const [url] of text.matchAll(/https?:\/\/[^\s"'`)]*/g)) if (!XMLNS.has(url)) hit('runtime-url', url)
  return hits
}

const rulesOf = (file: string, text: string) => [...new Set(lint(file, text).map((h) => h.rule))]

describe('design lint catches each rule', () => {
  test.each<[Rule, string, string]>([
    ['italic', 'src/styles.css', '.k-scene h2 { font-style: italic; }'],
    ['italic', 'src/ui/x.ts', 'el.style.fontStyle = "italic"'],
    ['italic', 'decks/d/scene.ts', 'html.innerHTML = "<h2>The <em>new</em> way</h2>"'],
    ['italic', 'decks/d/scene.md', '## The *new* way\n\n- A step.\n'],
    ['italic', 'decks/d/scene.md', '## The _new_ way\n'],
    ['monospace', 'src/styles.css', '.k-sp-time { font-family: ui-monospace, monospace; }'],
    ['monospace', 'decks/d/scene.ts', 'html.style.fontFamily = "monospace"'],
    ['pill-button', 'src/styles.css', '.k-btn { border-radius: 999px; }'],
    ['pill-button', 'src/styles.css', 'button.k-x { padding: 4px; border-radius: 50%; }'],
    ['pill-button', 'src/ui/x.ts', 'Object.assign(button.style, { borderRadius: "9999px" })'],
    ['numbered-label', 'decks/d/section.md', '# 01 Opening\n'],
    ['numbered-label', 'decks/d/scene.md', '## Value stream\n\n- 02 Analysis\n'],
    ['numbered-label', 'src/strings.ts', 'export const strings = { en: { first: "01 First" } }'],
    ['numbered-label', 'src/ui/x.ts', 'b.textContent = `${"03"} Close`'],
    ['cream-background', 'src/styles.css', ':root { --k-bg: #FDF6E3; }'],
    ['cream-background', 'src/styles.css', '.k-stage { background: oldlace; }'],
    ['cream-background', 'decks/d/scene.ts', 'Object.assign(html.style, { backgroundColor: "ivory" })'],
    ['runtime-url', 'src/main.ts', 'import("https://cdn.example.com/lib.js")'],
    ['runtime-url', 'src/render/x.ts', 'const s = "http://example.com/a.svg" // fetched at run time'],
  ])('%s in %s', (rule, file, text) => {
    expect(rulesOf(file, text)).toContain(rule)
  })

  test('legitimate code passes', () => {
    const ok: [string, string][] = [
      ['src/styles.css', '.k-x { transition: opacity 0.6s; }\n.k-retro .k-code { font-family: monospace; }\n.k-dot { border-radius: 50%; }\n.k-btn { border-radius: 6px; }'],
      ['src/render/world.ts', 'const SVG = "http://www.w3.org/2000/svg";\n// see https://gsap.com/docs\n/* https://example.com */'],
      ['src/ui/x.ts', 'const mm = String(m).padStart(2, "0"); const v = "1.01"; const t = "09:30";'],
      ['decks/d/deck.md', '---\ntitle: Report\ndate: 2026-01-05\n---\n'],
      ['decks/d/scene.md', '## The **bold** way\n\n- Released on 2026-01-05 as v1.01.\n- A linen shirt on a beige wall.\n'],
      ['decks/d/scene.ts', 'import x from "./01-intro"; const id = "step01"; const re = /0[1-9]/;'],
      ['tests/unit/x.test.ts', 'expect(hash).toBe("#/a/b/01")'],
    ]
    for (const [file, text] of ok) expect(lint(file, text), file).toEqual([])
  })
})

describe('design lint over the repo', () => {
  // klappe's own src; the decks of the repo that runs the tests (a deck repo or klappe itself).
  const klappeDir = fileURLToPath(new URL('../../', import.meta.url))
  const scan = (root: string, dir: string, exts: string[]) => {
    const abs = path.join(root, dir)
    if (!fs.existsSync(abs)) return []
    return (fs.readdirSync(abs, { recursive: true }) as string[])
      .filter((f) => exts.includes(path.extname(f)))
      .map((f) => ({ file: `${dir}/${f.replaceAll('\\', '/')}`, abs: path.join(abs, f) }))
  }
  const files = [...scan(klappeDir, 'src', ['.css', '.ts']), ...scan(process.cwd(), 'decks', ['.ts', '.md'])]

  test('finds the files to check', () => {
    expect(files.some((f) => f.file === 'src/styles.css')).toBe(true)
  })

  test('no design rule is broken', () => {
    const hits = files.flatMap(({ file, abs }) => lint(file, fs.readFileSync(abs, 'utf8').replaceAll('\r\n', '\n')))
    expect(hits.map((h) => `${h.rule}: ${h.at}`)).toEqual([])
  })
})
