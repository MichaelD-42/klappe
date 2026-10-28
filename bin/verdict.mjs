import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runnerImport } from 'vite'

// The verdict gate: reads the reviewers' reports, checks their format, and maps each RUBRIC line through its
// rubric's rule to a decision. The rule is a lookup, not a judgment; the reviewers only report levels.
// Usage: node bin/verdict.mjs --kind <framework|deck> [--task <id>] [--log <file>] <report>...
const klappeDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SEVERITIES = ['Critical', 'Important', 'Minor']
const RULE_SEVERITIES = ['none', ...SEVERITIES]
const ORDER = ['planner', 'builder', 'owner', 'pass'] // worst first
const KINDS = ['framework', 'deck']
const SEP = ' — '

// The rubrics by dimension: { dimension, version, applies_to, levels, rule: { <level>: { severity, disposition } } }.
// Throws on a rubric whose frontmatter the gate cannot use, so a broken rubric never passes silently.
export async function loadRubrics(dir = path.join(klappeDir, '.rubrics')) {
  const load = async (p) => (await runnerImport(path.join(klappeDir, p), { configFile: false, logLevel: 'error' })).module
  const { parseFrontmatter } = await load('src/parse/frontmatter.ts')
  const rubrics = {}
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
    const d = parseFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8')).data
    const bad = (why) => new Error(`${f}: ${why}`)
    if (typeof d.dimension !== 'string' || !d.dimension) throw bad('needs a dimension')
    if (!Array.isArray(d.levels) || !d.levels.length) throw bad('needs levels: [..]')
    const rule = {}
    for (const level of d.levels) {
      const r = d[`rule-${level}`]
      if (!Array.isArray(r) || !RULE_SEVERITIES.includes(r[0]) || !ORDER.includes(r[1])) {
        throw bad(`rule-${level} needs [<${RULE_SEVERITIES.join('|')}>, <${ORDER.join('|')}>]`)
      }
      rule[level] = { severity: r[0], disposition: r[1] }
    }
    rubrics[d.dimension] = { dimension: d.dimension, version: d.version, applies_to: Array.isArray(d.applies_to) ? d.applies_to : [], levels: d.levels, rule }
  }
  return rubrics
}

// One report's verdict, findings and RUBRIC lines, plus its format problems. `ref` is the scene id of a
// scene_purpose line (`<level> — <scene id> — <evidence>`), else null.
export function parseReport(text, rubrics) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  const problems = []
  const verdict = /^VERDICT: (PASS|FAIL)\s*$/.exec(lines[0] ?? '')?.[1] ?? null
  if (!verdict) problems.push('first line must be "VERDICT: PASS" or "VERDICT: FAIL"')
  const findings = []
  const rubric = []
  lines.slice(1).forEach((raw, i) => {
    const line = raw.trim()
    const at = `line ${i + 2}`
    if (line.startsWith('RUBRIC')) {
      const m = /^RUBRIC (\S+): (\S+) — (.+)$/.exec(line)
      if (!m) return problems.push(`${at}: RUBRIC line needs "RUBRIC <dimension>: <level> — <evidence>"`)
      const [, dimension, level, rest] = m
      const r = rubrics[dimension]
      if (!r) return problems.push(`${at}: unknown dimension "${dimension}"`)
      if (!r.levels.includes(level)) return problems.push(`${at}: ${dimension} has no level "${level}" (${r.levels.join(', ')})`)
      const parts = rest.split(SEP)
      const ref = dimension === 'scene_purpose' && parts.length > 1 ? parts.shift().trim() : null
      rubric.push({ dimension, level, ref, evidence: parts.join(SEP).trim() })
    } else if (line.includes(SEP)) {
      // shortcut: any other line with " — " counts as a finding, so prose with an em dash fails the format.
      const severity = line.split(SEP)[1].trim()
      if (!SEVERITIES.includes(severity)) return problems.push(`${at}: severity "${severity}" is not Critical, Important or Minor`)
      findings.push({ line, severity })
    }
  })
  // A verdict that disagrees with its own findings means the reviewer misread the rule; reject it.
  const blocking = (s) => s === 'Critical' || s === 'Important'
  const n = findings.filter((f) => blocking(f.severity)).length + rubric.filter((r) => blocking(rubrics[r.dimension].rule[r.level].severity)).length
  if (verdict === 'FAIL' && !n) problems.push('VERDICT: FAIL but nothing blocks')
  if (verdict === 'PASS' && n) problems.push(`VERDICT: PASS but ${n} blocking`)
  return { verdict, findings, rubric, problems }
}

// The dimensions that apply to the kind but have no RUBRIC line in any of the parsed reports.
export function missingDimensions(parsed, rubrics, kind) {
  const seen = new Set(parsed.flatMap((p) => p.rubric.map((r) => r.dimension)))
  return Object.values(rubrics).filter((r) => r.applies_to.includes(kind) && !seen.has(r.dimension)).map((r) => r.dimension)
}

// The rule: each RUBRIC line maps to a severity and a disposition; a Critical or Important finding is `builder`.
// The decision is the worst disposition, `merge` when all pass. `rows` are the log lines, one per RUBRIC line.
export function decide(parsed, rubrics) {
  const items = []
  const rows = []
  for (const p of parsed) {
    for (const r of p.rubric) {
      const { severity, disposition } = rubrics[r.dimension].rule[r.level]
      rows.push({ dimension: r.dimension, version: rubrics[r.dimension].version, level: r.level, ref: r.ref, severity, disposition })
      const ref = r.ref ? ` ${r.ref}` : ''
      items.push({ disposition, reason: `${r.dimension}: ${r.level}${ref} (${severity}, ${disposition}) — ${r.evidence}` })
    }
    for (const f of p.findings) {
      if (f.severity !== 'Minor') items.push({ disposition: 'builder', reason: `finding (${f.severity}, builder): ${f.line}` })
    }
  }
  const reasons = items.filter((x) => x.disposition !== 'pass').sort((a, b) => ORDER.indexOf(a.disposition) - ORDER.indexOf(b.disposition))
  const worst = reasons[0]?.disposition ?? 'pass'
  return { decision: worst === 'pass' ? 'merge' : worst, reasons: reasons.map((x) => x.reason), rows }
}

async function main(argv) {
  const opts = {}
  const reports = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--kind' || a === '--task' || a === '--log') opts[a.slice(2)] = argv[++i]
    else reports.push(a)
  }
  if (!KINDS.includes(opts.kind) || !reports.length) {
    console.error('Usage: node bin/verdict.mjs --kind <framework|deck> [--task <id>] [--log <file>] <report>...')
    return 2
  }
  const rubrics = await loadRubrics()
  const problems = []
  const parsed = reports.map((f) => {
    let text
    try {
      text = fs.readFileSync(f, 'utf8')
    } catch {
      problems.push(`format: ${f}: cannot read the file`)
      return { verdict: null, findings: [], rubric: [], problems: [] }
    }
    const p = parseReport(text, rubrics)
    problems.push(...p.problems.map((x) => `format: ${f}: ${x}`))
    return p
  })
  for (const d of missingDimensions(parsed, rubrics, opts.kind)) problems.push(`format: ${reports.join(', ')}: no RUBRIC line for ${d}`)
  if (problems.length) {
    console.error(problems.join('\n'))
    return 2
  }
  const { decision, reasons, rows } = decide(parsed, rubrics)
  console.log([`DECISION: ${decision}`, ...reasons].join('\n'))
  if (opts.log && rows.length) {
    const date = new Date().toISOString()
    const json = rows.map((r) => JSON.stringify({ date, task: opts.task ?? null, kind: opts.kind, ...r }))
    fs.appendFileSync(opts.log, json.join('\n') + '\n')
  }
  return decision === 'merge' ? 0 : 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv.slice(2))
