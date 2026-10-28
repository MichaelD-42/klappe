import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadRubrics, parseReport } from './verdict.mjs'

// The eval runner: runs each case of a suite in a fresh copy of HEAD, with the case's planted change on top, and grades
// what Claude did there. Usage: node bin/eval.mjs <reviewers|skill> [--case <name>] [--runs <n>]
// Claude runs as KLAPPE_CLAUDE (default `claude`); a .mjs or .js there runs with node, so a test can stub it.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SUITES = {
  reviewers: { tools: 'Read,Grep,Glob,Bash', maxTurns: 40 },
  skill: { tools: 'Read,Grep,Glob,Bash,Edit,Write,Skill', maxTurns: 60 },
}
const USAGE = 'Usage: node bin/eval.mjs <reviewers|skill> [--case <name>] [--runs <n>]'

const git = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 << 20 })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr.trim()}`)
  return r.stdout
}

// Reviewer grading: the verdict must match, and each expected dimension must have a RUBRIC line at that level.
export function gradeReview(text, expect, rubrics) {
  const report = parseReport(text.trimStart(), rubrics)
  const wrong = []
  if (report.verdict !== expect.verdict) wrong.push(`verdict ${report.verdict} != ${expect.verdict}`)
  for (const [dimension, level] of Object.entries(expect.rubric ?? {})) {
    const got = report.rubric.filter((r) => r.dimension === dimension).map((r) => r.level)
    if (!got.includes(level)) wrong.push(`${dimension} ${got.join(',') || 'missing'} != ${level}`)
  }
  return { pass: !wrong.length, wrong, verdict: report.verdict, rubric: report.rubric, problems: report.problems }
}

// Skill grading on the copy `dir`: each `match` glob needs a file whose text matches; no file the run changed
// (`changed`, repo-relative) may match an `absent` glob and its regex.
export function gradeSkill(dir, changed, expect) {
  const wrong = []
  for (const [glob, re] of Object.entries(expect.match)) {
    const files = fs.globSync(glob, { cwd: dir }).map((f) => path.join(dir, f)).filter((f) => fs.statSync(f).isFile())
    if (!files.some((f) => new RegExp(re, 'm').test(fs.readFileSync(f, 'utf8')))) wrong.push(`no ${glob} matches /${re}/`)
  }
  for (const [glob, re] of Object.entries(expect.absent ?? {})) {
    for (const f of changed.filter((f) => path.posix.matchesGlob(f, glob))) {
      const p = path.join(dir, f)
      if (fs.existsSync(p) && new RegExp(re, 'm').test(fs.readFileSync(p, 'utf8'))) wrong.push(`${f} matches /${re}/ (must be absent)`)
    }
  }
  return { pass: !wrong.length, wrong }
}

// pass@1 is the share of runs that passed, pass^k whether all k did. Recall and the false-block rate count reviewer
// runs: expected FAIL cases that failed, and expected PASS cases that failed. Both count graded runs only; a run with
// an error (Claude failed, or no verdict) counts in `errors` instead.
export function summarize(suite, cases) {
  const all = cases.flatMap((c) => c.runs)
  const rate = (runs) => ({ n: runs.length, k: runs.filter((r) => r.verdict === 'FAIL').length })
  const reviewRuns = (v) => cases.filter((c) => c.expect.verdict === v).flatMap((c) => c.runs.filter((r) => !r.error))
  return {
    cases: cases.map((c) => ({ name: c.name, pass1: c.runs.filter((r) => r.pass).length / c.runs.length, passK: c.runs.every((r) => r.pass) })),
    ...(suite === 'reviewers' && { recall: rate(reviewRuns('FAIL')), falseBlock: rate(reviewRuns('PASS')) }),
    errors: all.filter((r) => r.error).length,
    cost: all.reduce((s, r) => s + (r.cost ?? 0), 0),
  }
}

// On Windows a headless claude may pick the PowerShell tool, and the agents name Bash: without a shell, a reviewer
// cannot run npm test. Point it at Git's bash (git --exec-path is <git>/mingw64/libexec/git-core) unless the
// user already chose.
function shellEnv() {
  const env = { ...process.env }
  if (process.platform !== 'win32' || 'CLAUDE_CODE_USE_POWERSHELL_TOOL' in env) return env
  env.CLAUDE_CODE_USE_POWERSHELL_TOOL = '0'
  const bash = path.resolve(git(root, '--exec-path').trim(), '../../../bin/bash.exe')
  if (!env.CLAUDE_CODE_GIT_BASH_PATH && fs.existsSync(bash)) env.CLAUDE_CODE_GIT_BASH_PATH = bash
  return env
}

function claude(cwd, args) {
  const bin = process.env.KLAPPE_CLAUDE || 'claude'
  const [cmd, argv] = /\.m?js$/.test(bin) ? [process.execPath, [bin, ...args]] : [bin, args]
  const r = spawnSync(cmd, argv, { cwd, env: shellEnv(), encoding: 'utf8', maxBuffer: 64 << 20, timeout: 30 * 60_000 })
  if (r.error) throw r.error
  let out
  try {
    out = JSON.parse(r.stdout)
  } catch {
    throw new Error(`claude exit ${r.status}, no JSON: ${(r.stderr || r.stdout).trim().slice(0, 500)}`)
  }
  return { text: String(out.result ?? ''), cost: out.total_cost_usd ?? 0, isError: !!out.is_error }
}

// One run: a fresh copy of HEAD with the overlay committed on top, Claude in it, the grade; the copy goes in every case.
async function runOnce(suite, c, rubrics) {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'klappe-eval-'))
  const link = path.join(copy, 'node_modules')
  try {
    git(root, 'worktree', 'add', '--detach', copy, 'HEAD')
  } catch (e) {
    fs.rmSync(copy, { recursive: true, force: true })
    return { pass: false, cost: 0, error: String(e.message ?? e) }
  }
  try {
    fs.symlinkSync(path.join(root, 'node_modules'), link, 'junction')
    const overlay = path.join(c.dir, 'overlay')
    if (fs.existsSync(overlay)) {
      fs.cpSync(overlay, copy, { recursive: true })
      git(copy, 'add', '-A') // .gitignore keeps the node_modules junction out
      git(copy, '-c', 'user.name=klappe-eval', '-c', 'user.email=eval@klappe.invalid', 'commit', '-q', '-m', `eval: ${c.name}`)
    }
    const { tools, maxTurns } = SUITES[suite]
    // shortcut: the prompt goes as one argument, and Windows caps a command line near 32k characters; keep overlays
    // small, or pass the prompt on stdin if a case outgrows it.
    const prompt =
      suite === 'reviewers'
        ? `${c.brief}\n\nThe change is the last commit in this copy of the repo. There is no builder report.\n\nThe diff (\`git diff HEAD~1\`):\n\n\`\`\`diff\n${git(copy, 'diff', 'HEAD~1')}\`\`\`\n`
        : c.prompt
    const args = ['-p', ...(c.agent ? ['--agent', c.agent] : []), '--output-format', 'json', '--max-turns', String(maxTurns), `--allowedTools=${tools}`, prompt]
    const out = claude(copy, args)
    if (out.isError) return { pass: false, cost: out.cost, error: `claude: ${out.text.slice(0, 500)}`, text: out.text }
    if (suite === 'reviewers') {
      const g = gradeReview(out.text, c.expect, rubrics)
      return { ...g, ...(!g.verdict && { error: `no verdict: ${g.problems.join('; ')}` }), cost: out.cost, text: out.text }
    }
    git(copy, 'add', '-A')
    const changed = git(copy, 'diff', '--cached', '--name-only', '--no-renames', 'HEAD').split('\n').filter(Boolean)
    return { ...gradeSkill(copy, changed, c.expect), changed, cost: out.cost, text: out.text }
  } catch (e) {
    return { pass: false, cost: 0, error: String(e.message ?? e) }
  } finally {
    // The junction goes first, so removing the copy never reaches into the real node_modules.
    if (fs.existsSync(link)) fs.unlinkSync(link)
    try {
      git(root, 'worktree', 'remove', '--force', copy)
    } catch {
      // A process Claude left running (a dev server) can hold files open on Windows; warn and go on to the next run.
      try {
        fs.rmSync(copy, { recursive: true, force: true, maxRetries: 3 })
      } catch (e) {
        console.error(`could not remove ${copy}: ${e.message}`)
      }
      git(root, 'worktree', 'prune')
    }
  }
}

async function main(argv) {
  const suite = argv[0]
  const opt = (name, def) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : def)
  const only = opt('--case')
  const runs = Number(opt('--runs', '1'))
  if (!SUITES[suite] || !(runs >= 1)) {
    console.error(USAGE)
    return 2
  }
  const dir = path.join(root, 'evals', suite)
  const names = fs.readdirSync(dir).filter((n) => fs.existsSync(path.join(dir, n, 'case.json')) && (!only || n === only))
  if (!names.length) {
    console.error(`no case ${only ? `"${only}" ` : ''}in evals/${suite}`)
    return 2
  }
  const rubrics = suite === 'reviewers' ? await loadRubrics() : null
  const cases = []
  for (const name of names) {
    const c = { name, dir: path.join(dir, name), ...JSON.parse(fs.readFileSync(path.join(dir, name, 'case.json'), 'utf8')) }
    const done = { name, expect: c.expect, runs: [] }
    for (let i = 1; i <= runs; i++) {
      const r = await runOnce(suite, c, rubrics)
      done.runs.push(r)
      const why = r.error ?? [...(r.wrong ?? []), ...(r.problems ?? []).map((p) => `format: ${p}`)].join('; ')
      console.log(`${suite}/${name} run ${i}: ${r.pass ? 'PASS' : 'FAIL'}  $${r.cost.toFixed(2)}${why ? `  ${why}` : ''}`)
    }
    cases.push(done)
  }
  const s = summarize(suite, cases)
  const pct = ({ n, k }) => `${k}/${n} runs${n ? ` (${Math.round((100 * k) / n)}%)` : ''}`
  console.log('')
  for (const c of s.cases) console.log(`${c.name}: pass@1 ${c.pass1.toFixed(2)}, pass^${runs} ${c.passK ? 1 : 0}`)
  if (s.recall) console.log(`recall: ${pct(s.recall)}\nfalse-block rate: ${pct(s.falseBlock)}`)
  console.log(`errors: ${s.errors}`)
  console.log(`cost: $${s.cost.toFixed(2)}`)
  const out = path.join(root, 'evals', 'results', `${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify({ suite, runs, cases, summary: s }, null, 2))
  console.log(`results: ${path.relative(root, out).replaceAll('\\', '/')}`)
  return s.cases.every((c) => c.passK) ? 0 : 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv.slice(2))
