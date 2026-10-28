import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, expect, test } from 'vitest';
// @ts-expect-error plain .mjs, no types
import { gradeReview, gradeSkill, summarize } from '../../bin/eval.mjs';
// @ts-expect-error plain .mjs, no types
import { loadRubrics } from '../../bin/verdict.mjs';

const ROOT = join(__dirname, '../..');
const BIN = join(ROOT, 'bin/eval.mjs');

// A stub for `claude`: it records its argv and cwd, writes STUB_WRITE (path=text) into the copy, and prints
// STUB_RESULT as the JSON `claude -p --output-format json` prints.
const STUB = `import fs from 'node:fs'; import path from 'node:path'
fs.writeFileSync(process.env.STUB_LOG, JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd() }))
const w = process.env.STUB_WRITE
if (w) { const p = w.slice(0, w.indexOf('=')), t = w.slice(w.indexOf('=') + 1); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t) }
console.log(JSON.stringify({ result: process.env.STUB_RESULT ?? '', total_cost_usd: 0.25, is_error: !!process.env.STUB_IS_ERROR, num_turns: 3 }))`;

let rubrics: any;
let dir: string;
beforeAll(async () => {
  rubrics = await loadRubrics();
  dir = mkdtempSync(join(tmpdir(), 'eval-test-'));
  writeFileSync(join(dir, 'stub.mjs'), STUB);
});

function run(args: string[], env: Record<string, string>) {
  const log = join(dir, 'log.json');
  const r = spawnSync(process.execPath, [BIN, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, KLAPPE_CLAUDE: join(dir, 'stub.mjs'), STUB_LOG: log, ...env },
  });
  const results = /^results: (.+)$/m.exec(r.stdout)?.[1];
  const result = results && JSON.parse(readFileSync(join(ROOT, results), 'utf8'));
  if (results) rmSync(join(ROOT, results)); // the test leaves no result file behind
  return { ...r, result, call: JSON.parse(readFileSync(log, 'utf8')) };
}

test('a reviewer case runs in a removed copy with the planted diff, and grades with the verdict parser', () => {
  const r = run(['reviewers', '--case', 'tech-step-dom'], {
    STUB_RESULT: 'VERDICT: FAIL\ndecks/demo/sections/106-basics/20-badge/scene.ts:14 — Critical — a step creates DOM — build it in build()',
  });
  expect(r.stderr).toBe('');
  expect(r.status).toBe(0);
  const [p, ...rest] = r.call.argv;
  expect(p).toBe('-p');
  expect(rest.slice(0, -1)).toEqual(['--agent', 'klappe-review-tech', '--output-format', 'json', '--max-turns', '40', '--allowedTools=Read,Grep,Glob,Bash']);
  const prompt = rest.at(-1);
  expect(prompt).toContain('AK-2: Step 1 shows the title');
  expect(prompt).toContain('+++ b/decks/demo/sections/106-basics/20-badge/scene.ts');
  expect(existsSync(r.call.cwd)).toBe(false); // the copy is gone
  expect(r.stdout).toContain('reviewers/tech-step-dom run 1: PASS  $0.25');
  expect(r.stdout).toContain('recall: 1/1 runs (100%)');
  expect(r.stdout).toContain('false-block rate: 0/0 runs');
  expect(r.stdout).toContain('cost: $0.25');
  expect(r.result.cases[0].runs[0]).toMatchObject({ pass: true, verdict: 'FAIL', cost: 0.25 });
}, 120_000); // a real git worktree per run

test('a skill case grades the files the run wrote', () => {
  const r = run(['skill', '--case', 'typed', '--runs', '1'], {
    STUB_WRITE: 'decks/demo/sections/106-basics/20-motto/scene.ts=box.el.textContent = typed(line, p)',
  });
  expect(r.status).toBe(0);
  expect(r.call.argv.slice(0, 6)).toEqual(['-p', '--output-format', 'json', '--max-turns', '60', '--allowedTools=Read,Grep,Glob,Bash,Edit,Write,Skill']);
  expect(r.result.cases[0].runs[0]).toMatchObject({ pass: true, changed: ['decks/demo/sections/106-basics/20-motto/scene.ts'] });
  expect(r.stdout).toContain('typed: pass@1 1.00, pass^1 1');
  expect(r.stdout).not.toContain('recall');
}, 120_000);

test('a failed Claude run and a report with no verdict count as errors, not in recall', () => {
  for (const env of [{ STUB_IS_ERROR: '1', STUB_RESULT: 'max turns' }, { STUB_RESULT: 'I looked at it.' }]) {
    const r = run(['reviewers', '--case', 'tech-step-dom'], env);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('recall: 0/0 runs');
    expect(r.stdout).toContain('errors: 1');
    expect(r.result.summary.errors).toBe(1);
    expect(r.result.cases[0].runs[0]).toMatchObject({ pass: false, error: expect.any(String) });
  }
}, 240_000);

test('gradeReview: a wrong verdict and a wrong level fail, with the format problems kept', () => {
  const report = 'VERDICT: PASS\nRUBRIC intent_fidelity: full — AK-1 at a.md:1\nRUBRIC scene_purpose: clear — basics/x — the point';
  expect(gradeReview(report, { verdict: 'PASS', rubric: { scene_purpose: 'clear' } }, rubrics).pass).toBe(true);
  const bad = gradeReview(report, { verdict: 'FAIL', rubric: { scene_purpose: 'unclear' } }, rubrics);
  expect(bad.wrong).toEqual(['verdict PASS != FAIL', 'scene_purpose clear != unclear']);
  expect(gradeReview('I looked at it.', { verdict: 'FAIL' }, rubrics)).toMatchObject({ pass: false, verdict: null, problems: [expect.any(String)] });
});

test('gradeSkill: a missing match and a changed file under an absent glob fail; old files there do not', () => {
  const copy = mkdtempSync(join(tmpdir(), 'eval-grade-'));
  mkdirSync(join(copy, 'shared'));
  writeFileSync(join(copy, 'shared/old.ts'), 'x');
  writeFileSync(join(copy, 'shared/new.ts'), 'x');
  writeFileSync(join(copy, 'scene.md'), '```chat\nuser: hi\n```');
  const expect1 = { match: { '*.md': '^```chat' }, absent: { 'shared/**': '[\\s\\S]' } };
  expect(gradeSkill(copy, ['scene.md'], expect1)).toEqual({ pass: true, wrong: [] });
  expect(gradeSkill(copy, ['scene.md', 'shared/new.ts'], expect1).wrong).toEqual(['shared/new.ts matches /[\\s\\S]/ (must be absent)']);
  expect(gradeSkill(copy, [], { match: { '*.ts': 'cycle\\(' } }).wrong).toEqual(['no *.ts matches /cycle\\(/']);
  rmSync(copy, { recursive: true });
});

test('summarize: pass@1, pass^k, recall, false-block rate, errors and cost', () => {
  const s = summarize('reviewers', [
    { name: 'a', expect: { verdict: 'FAIL' }, runs: [{ pass: true, verdict: 'FAIL', cost: 1 }, { pass: false, verdict: 'PASS', cost: 1 }] },
    { name: 'b', expect: { verdict: 'PASS' }, runs: [{ pass: false, verdict: 'FAIL', cost: 0.5 }, { pass: true, verdict: 'PASS' }, { pass: false, verdict: null, error: 'no verdict' }] },
  ]);
  expect(s).toEqual({
    cases: [{ name: 'a', pass1: 0.5, passK: false }, { name: 'b', pass1: 1 / 3, passK: false }],
    recall: { n: 2, k: 1 },
    falseBlock: { n: 2, k: 1 },
    errors: 1,
    cost: 2.5,
  });
});
