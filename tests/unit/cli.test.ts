import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

// npm scripts hardcode "--deck demo"; `npm run dev -- --deck x` appends a second one, which must win.
test('the last --deck wins', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'cli-')); // no decks/ here, so the CLI stops at "Deck not found"
  const r = spawnSync(process.execPath, [join(__dirname, '../../bin/klappe.mjs'), 'build', '--deck', 'first', '--deck', 'second'], {
    cwd,
    encoding: 'utf8',
  });
  expect(r.status).toBe(1);
  expect(r.stderr).toContain(join('decks', 'second'));
});
