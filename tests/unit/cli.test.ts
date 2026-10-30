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

test('--version prints the version from package.json', () => {
  const r = cli(mkdtempSync(join(tmpdir(), 'cli-')), '--version');
  expect(r.status).toBe(0);
  expect(r.stdout.trim()).toBe(JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8')).version);
  expect(r.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
});

test('outline prints a fresh deck from init, and init adds the shot and outline scripts', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'cli-'));
  expect(cli(cwd, 'init', '--deck', 'talk').status).toBe(0);
  const scripts = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')).scripts;
  expect(scripts.shot).toBe('node klappe/bin/klappe.mjs shot');
  expect(scripts.outline).toBe('node klappe/bin/klappe.mjs outline');
  const r = cli(cwd, 'outline');
  expect(r.status).toBe(0);
  expect(r.stdout).toContain('### intro/hello: Hello (1 step)\n1. Welcome.');
});

// A duplicate id otherwise shows only in the full e2e run; `test --only` never assembles the whole deck.
test('test stops before the browser on a deck problem, such as a duplicate scene id', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'cli-'));
  const files: Record<string, string> = {
    'decks/x/deck.md': '---\ntitle: T\n---\n',
    'decks/x/sections/10-a/section.md': '# A\n',
    'decks/x/sections/10-a/10-same/scene.md': '## One\n\n- One.\n',
    'decks/x/sections/20-b/section.md': '# B\n',
    'decks/x/sections/20-b/10-same/scene.md': '## Two\n\n- Two.\n',
  };
  for (const [f, text] of Object.entries(files)) {
    mkdirSync(join(cwd, f, '..'), { recursive: true });
    writeFileSync(join(cwd, f), text);
  }
  const r = cli(cwd, 'test', '--deck', 'x', '--only', 'a/same');
  expect(r.status).toBe(1);
  expect(r.stderr).toContain("deck problem: duplicate scene id 'same'");
  expect(r.stdout).not.toContain('RUN'); // vitest never started
}, 30_000);

// shot --help rendered every scene of the deck (about 9 min): --help or -h on any command prints the usage and stops.
test('--help after a command prints the usage, before it picks a deck or starts anything', () => {
  for (const args of [['shot', '--help'], ['test', '-h'], ['--help']]) {
    const r = cli(mkdtempSync(join(tmpdir(), 'cli-')), ...args); // no decks/ here: a run past the usage would fail
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('usage: klappe');
  }
});

// klappe dev --port 5174 --strictPort served on 5173.
test('dev serves on the --port it is given', async () => {
  const { spawn } = await import('node:child_process')
  const port = String(20000 + Math.floor(Math.random() * 20000))
  const p = spawn(process.execPath, [join(__dirname, '../../bin/klappe.mjs'), 'dev', '--deck', 'demo', '--port', port, '--strictPort'], { cwd: join(__dirname, '../..') })
  try {
    const out = await new Promise<string>((ok, fail) => {
      let text = ''
      const timer = setTimeout(() => fail(new Error(`no URL in 30 s:\n${text}`)), 30_000)
      const read = (b: Buffer) => {
        text += b
        if (/localhost:\d+/.test(text)) clearTimeout(timer), ok(text)
      }
      p.stdout.on('data', read)
      p.stderr.on('data', read)
    })
    expect(out).toContain(`localhost:${port}`)
  } finally {
    p.kill()
  }
}, 40_000)

// The starter deck comes from template/: the folders and deck.md keys the work decks each ended up with.
test('init copies the template: deck.md with the common keys and a word cap, the slots and a README', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'cli-'));
  expect(cli(cwd, 'init', '--deck', 'talk').status).toBe(0);
  const deck = join(cwd, 'decks/talk');
  const md = readFileSync(join(deck, 'deck.md'), 'utf8');
  for (const key of ['title: talk', 'lang: en', 'theme: calm', 'intensity: calm', 'confidential: false', 'max-words: 12']) expect(md).toContain(key);
  for (const f of ['deck.css', 'data', 'media', 'shared', 'README.md', 'sections/10-intro/10-hello/scene.md']) expect(existsSync(join(deck, f)), f).toBe(true);
  expect(readFileSync(join(deck, 'README.md'), 'utf8')).toContain('npm run klappe:sync');
  // The word cap is on from the first scene: a long step is reported.
  writeFileSync(join(deck, 'sections/10-intro/10-hello/scene.md'), '## Hello\n\n- one two three four five six seven eight nine ten eleven twelve thirteen\n');
  const { overWords } = await import('../../bin/outline.mjs');
  expect(await overWords(join(__dirname, '../..'), deck)).toEqual(['#/intro/hello/1: 13 words > 12']);
}, 60_000);
