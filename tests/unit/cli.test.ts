import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
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

const cli = (cwd: string, ...args: string[]) =>
  spawnSync(process.execPath, [join(__dirname, '../../bin/klappe.mjs'), ...args], { cwd, encoding: 'utf8' });

test('a flag after --deck is not taken as the deck id', () => {
  const r = cli(mkdtempSync(join(tmpdir(), 'cli-')), 'build', '--deck', '--foo');
  expect(r.status).toBe(1);
  expect(r.stderr).toContain('--deck needs an id');
});

test('init says it moved klappe from devDependencies to dependencies', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'cli-'));
  writeFileSync(join(cwd, 'package.json'), JSON.stringify({ name: 'd', devDependencies: { klappe: 'file:./klappe' } }));
  const r = cli(cwd, 'init', '--deck', 'talk');
  expect(r.status).toBe(0);
  expect(r.stdout).toContain('Moved klappe from devDependencies to dependencies');
  const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
  expect(pkg.devDependencies.klappe).toBeUndefined();
  expect(pkg.dependencies.klappe).toBe('file:./klappe');
});

// A copy of the CLI in a temp folder, reached through a symlink: the same folder by another path
// (the Windows case is the same mistake). The copy keeps a failure from writing into this repo.
test('init refuses the klappe folder reached by another path', () => {
  const fake = mkdtempSync(join(tmpdir(), 'klappe-'));
  mkdirSync(join(fake, 'bin'));
  for (const f of ['klappe.mjs', 'sync-claude.mjs']) copyFileSync(join(__dirname, '../../bin', f), join(fake, 'bin', f));
  const link = join(mkdtempSync(join(tmpdir(), 'link-')), 'k');
  symlinkSync(fake, link);
  const r = spawnSync(process.execPath, [join(fake, 'bin/klappe.mjs'), 'init', '--deck', 'talk'], { cwd: link, encoding: 'utf8' });
  expect(r.status).toBe(1);
  expect(r.stderr).toContain('not in the klappe folder');
  expect(existsSync(join(fake, 'decks'))).toBe(false);
});
