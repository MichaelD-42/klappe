import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

// The real commands in a throwaway deck repo: init, theme with a logo, then the walk, which fails on any theme problem.
const klappe = (cwd: string, ...args: string[]) =>
  spawnSync(process.execPath, [join(__dirname, '../../bin/klappe.mjs'), ...args], { cwd, encoding: 'utf8' });

test.each([
  ['dark', ['#3366ff', '#ff6633']],
  ['light', ['#fff59d', '#0a1f44']],
])('a %s brand theme with a logo passes the contrast check and the walk', (mode, colors) => {
  const cwd = mkdtempSync(join(tmpdir(), 'brand-'));
  mkdirSync(join(cwd, 'decks'));
  cpSync(join(__dirname, '../../template'), join(cwd, 'decks/talk'), { recursive: true });
  const deckMd = join(cwd, 'decks/talk/deck.md');
  writeFileSync(deckMd, readFileSync(deckMd, 'utf8').replaceAll('{{id}}', 'talk').replace(/^theme: .*/m, 'theme: acme'));
  writeFileSync(join(cwd, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 176 50"><rect width="176" height="50" fill="#888"/></svg>');
  const t = klappe(cwd, 'theme', '--deck', 'talk', '--name', 'acme', '--colors', colors.join(','), '--logo', 'logo.svg', ...(mode === 'light' ? ['--light'] : []));
  expect(t.status, t.stderr).toBe(0);
  const r = klappe(cwd, 'test', '--deck', 'talk', '--only', 'intro');
  expect(r.stdout + r.stderr).not.toContain('contrast');
  expect(r.status, r.stdout + r.stderr).toBe(0);
}, 120_000);
