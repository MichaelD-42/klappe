import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const svg = (viewBox: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><circle cx="12" cy="12" r="8"/></svg>`;

// A deck repo's icons/ serves its decks; the deck's own icons/ wins. The repo's "both" has a bad viewBox, so the walk
// is green only if the deck's "both" is the one loaded.
test('icon() finds a repo-level icon, and a deck icon of the same name wins', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'repo-icons-'));
  try {
    mkdirSync(join(cwd, 'decks'));
    cpSync(join(__dirname, '../../template'), join(cwd, 'decks/talk'), { recursive: true });
    const deckMd = join(cwd, 'decks/talk/deck.md');
    writeFileSync(deckMd, readFileSync(deckMd, 'utf8').replaceAll('{{id}}', 'talk'));
    mkdirSync(join(cwd, 'icons'));
    writeFileSync(join(cwd, 'icons/repo-only.svg'), svg('0 0 24 24'));
    writeFileSync(join(cwd, 'icons/both.svg'), svg('0 0 99 99'));
    mkdirSync(join(cwd, 'decks/talk/icons'));
    writeFileSync(join(cwd, 'decks/talk/icons/both.svg'), svg('0 0 24 24'));
    writeFileSync(
      join(cwd, 'decks/talk/sections/10-intro/10-hello/scene.ts'),
      `import { icon } from "klappe/fx";
export default {
  build: (ctx) => [
    icon(ctx, "repo-only", { x: 600, y: 500, color: "var(--k-fg)" }),
    icon(ctx, "both", { x: 900, y: 500, color: "var(--k-fg)" }),
  ],
  steps: [() => {}],
};
`,
    );
    const r = spawnSync(process.execPath, [join(__dirname, '../../bin/klappe.mjs'), 'test', '--deck', 'talk', '--only', 'intro'], { cwd, encoding: 'utf8' });
    expect(r.stdout + r.stderr).not.toMatch(/unknown Lucide name|viewBox/);
    expect(r.status, r.stdout + r.stderr).toBe(0);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}, 120_000);
