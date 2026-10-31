import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, expect, test } from 'vitest';
// @ts-expect-error plain .mjs, no types
import { decide, loadRubrics, missingDimensions, parseReport } from '../../bin/verdict.mjs';

const BIN = join(__dirname, '../../bin/verdict.mjs');
let rubrics: any;
beforeAll(async () => {
  rubrics = await loadRubrics(); // the real .rubrics/
});

// Writes each report to a temp file and runs the CLI on them.
function run(args: string[], ...reports: string[]) {
  const dir = mkdtempSync(join(tmpdir(), 'verdict-'));
  const files = reports.map((r, i) => {
    const f = join(dir, `r${i}.txt`);
    writeFileSync(f, r);
    return f;
  });
  const r = spawnSync(process.execPath, [BIN, ...args, ...files], { cwd: dir, encoding: 'utf8' });
  return { ...r, dir };
}

const FULL = 'RUBRIC intent_fidelity: full — AK-1 at bin/x.mjs:3';
const ARC = 'RUBRIC deck_arc: shaped — s1 — the hook, the line and the ask';
const CLEAR = 'RUBRIC scene_purpose: clear — s1/intro — the room learns X';

test('AK-1: reads the real rubrics with their rules', () => {
  expect(Object.keys(rubrics).sort()).toEqual(['deck_arc', 'intent_fidelity', 'scene_purpose']);
  expect(rubrics.intent_fidelity.rule.divergent).toEqual({ severity: 'Critical', disposition: 'planner' });
  expect(rubrics.scene_purpose.applies_to).toEqual(['deck']);
  expect(rubrics.deck_arc.applies_to).toEqual(['deck']);
});

test('AK-2: parseReport flags a bad first line, a bad severity, an unknown dimension and an unknown level', () => {
  const p = parseReport(
    ['Verdict: pass', 'src/a.ts:1 — High — p — e', 'RUBRIC tone: fits — x', 'RUBRIC intent_fidelity: mostly — x'].join('\n'),
    rubrics,
  );
  expect(p.verdict).toBeNull();
  expect(p.problems).toHaveLength(4);
  expect(p.problems.join('\n')).toMatch(/first line.*\n.*"High".*\n.*unknown dimension "tone".*\n.*no level "mostly"/);
});

test('AK-2: parseReport reads a good report; the scene id is the ref', () => {
  const p = parseReport(['VERDICT: FAIL', 'src/a.ts:1 — Important — p — e', CLEAR].join('\n'), rubrics);
  expect(p.problems).toEqual([]);
  expect(p.verdict).toBe('FAIL');
  expect(p.findings).toEqual([{ line: 'src/a.ts:1 — Important — p — e', severity: 'Important' }]);
  expect(p.rubric).toEqual([{ dimension: 'scene_purpose', level: 'clear', ref: 's1/intro', evidence: 'the room learns X' }]);
});

test('AK-2: VERDICT: FAIL with nothing blocking is a format problem', () => {
  const r = run(['--kind', 'framework'], 'VERDICT: FAIL\nx:1 — Minor — p — e\nRUBRIC intent_fidelity: unassessable — no criteria');
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/^format: .*r0\.txt: VERDICT: FAIL but nothing blocks$/m);
});

test('AK-2: VERDICT: PASS with a blocking finding or RUBRIC line is a format problem', () => {
  const r = run(['--kind', 'framework'], 'VERDICT: PASS\nx:1 — Critical — p — e\nRUBRIC intent_fidelity: partial — AK-2 open');
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/^format: .*r0\.txt: VERDICT: PASS but 2 blocking$/m);
});

test('AK-2: every dimension of the kind needs a RUBRIC line across the reports', () => {
  const p = [parseReport(`VERDICT: PASS\n${FULL}`, rubrics)];
  expect(missingDimensions(p, rubrics, 'framework')).toEqual([]);
  expect(missingDimensions(p, rubrics, 'deck')).toEqual(['deck_arc', 'scene_purpose']);
});

test('AK-2: the CLI prints each format problem and exits 2', () => {
  const r = run(['--kind', 'deck'], 'VERDICT: PASS\nx — Severe — p', `VERDICT: PASS\n${FULL}`);
  expect(r.status).toBe(2);
  expect(r.stderr).toMatch(/^format: .*r0\.txt: line 2: severity "Severe"/m);
  expect(r.stderr).toMatch(/^format: .*: no RUBRIC line for scene_purpose$/m);
});

test('AK-3: the worst disposition wins, in the order planner, builder, owner, pass', () => {
  const d = (...lines: string[]) => decide([parseReport(['VERDICT: PASS', ...lines].join('\n'), rubrics)], rubrics).decision;
  expect(d(FULL, CLEAR)).toBe('merge');
  expect(d(FULL, 'x:1 — Minor — p — e')).toBe('merge');
  expect(d(FULL, 'RUBRIC scene_purpose: weak — s1/a — e')).toBe('owner');
  expect(d('RUBRIC intent_fidelity: partial — e', 'RUBRIC scene_purpose: unclear — s1/a — e')).toBe('builder');
  expect(d(FULL, 'x:1 — Critical — p — e', 'RUBRIC scene_purpose: unclear — s1/a — e')).toBe('builder');
  expect(d('RUBRIC intent_fidelity: divergent — e', 'x:1 — Critical — p — e')).toBe('planner');
});

test('AK-3: the CLI prints the decision with reasons and exits 0 for merge, 1 otherwise', () => {
  const ok = run(['--kind', 'framework'], `VERDICT: PASS\n${FULL}`, 'VERDICT: PASS\nx:1 — Minor — p — e');
  expect(ok.status).toBe(0);
  expect(ok.stdout.trim()).toBe('DECISION: merge');
  const no = run(['--kind', 'deck'], `VERDICT: FAIL\nRUBRIC intent_fidelity: partial — AK-2 open`, 'VERDICT: PASS\nRUBRIC scene_purpose: weak — s2/b — repeats s1\n' + ARC);
  expect(no.status).toBe(1);
  expect(no.stdout.trim().split('\n')).toEqual([
    'DECISION: builder',
    'intent_fidelity: partial (Important, builder) — AK-2 open',
    'scene_purpose: weak s2/b (Minor, owner) — repeats s1',
  ]);
});

test('AK-4: --log appends one JSON line per RUBRIC line; no --log writes nothing', () => {
  const reports = [`VERDICT: PASS\n${FULL}\n${CLEAR}\n${ARC}`];
  // two runs into one log: it appends
  const log = join(mkdtempSync(join(tmpdir(), 'verdict-log-')), 'v.jsonl');
  run(['--kind', 'deck', '--task', 'T9', '--log', log], ...reports);
  run(['--kind', 'deck', '--log', log], ...reports);
  const rows = readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  expect(rows).toHaveLength(6);
  expect(Object.keys(rows[0])).toEqual(['date', 'task', 'kind', 'dimension', 'version', 'level', 'ref', 'severity', 'disposition']);
  expect(rows[0]).toMatchObject({ task: 'T9', kind: 'deck', dimension: 'intent_fidelity', version: 1, level: 'full', ref: null, severity: 'none', disposition: 'pass' });
  expect(rows[1]).toMatchObject({ dimension: 'scene_purpose', ref: 's1/intro' });
  expect(rows[3].task).toBeNull();
  const none = run(['--kind', 'deck'], ...reports);
  expect(readdirSync(none.dir)).toEqual(['r0.txt']);
});
