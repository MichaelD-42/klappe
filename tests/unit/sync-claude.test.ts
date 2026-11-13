import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
// @ts-expect-error plain .mjs, no types
import { syncClaude } from '../../bin/sync-claude.mjs';

test('copies klappe* entries, overwrites them, leaves others', () => {
  const src = mkdtempSync(join(tmpdir(), 'src-'));
  const dest = mkdtempSync(join(tmpdir(), 'dest-'));
  mkdirSync(join(src, '.claude/agents'), { recursive: true });
  mkdirSync(join(src, '.claude/skills/klappe'), { recursive: true });
  writeFileSync(join(src, '.claude/agents/klappe-a.md'), 'new');
  writeFileSync(join(src, '.claude/agents/other.md'), 'x');
  writeFileSync(join(src, '.claude/agents/klappeish.md'), 'x');
  writeFileSync(join(src, '.claude/skills/klappe/SKILL.md'), 'skill');
  mkdirSync(join(dest, '.claude/agents'), { recursive: true });
  writeFileSync(join(dest, '.claude/agents/klappe-a.md'), 'old');
  writeFileSync(join(dest, '.claude/agents/mine.md'), 'keep');

  syncClaude(src, dest);

  expect(readFileSync(join(dest, '.claude/agents/klappe-a.md'), 'utf8')).toBe('new');
  expect(readFileSync(join(dest, '.claude/agents/mine.md'), 'utf8')).toBe('keep');
  expect(existsSync(join(dest, '.claude/agents/other.md'))).toBe(false);
  expect(existsSync(join(dest, '.claude/agents/klappeish.md'))).toBe(false);
  expect(syncClaude(src, src)).toBeNull();
  expect(readFileSync(join(dest, '.claude/skills/klappe/SKILL.md'), 'utf8')).toBe('skill');
});

test('a file that left skills/klappe/ in klappe leaves the deck repo too; the deck\'s own skills stay', () => {
  const src = mkdtempSync(join(tmpdir(), 'src-'));
  const dest = mkdtempSync(join(tmpdir(), 'dest-'));
  mkdirSync(join(src, '.claude/skills/klappe'), { recursive: true });
  writeFileSync(join(src, '.claude/skills/klappe/SKILL.md'), 'new');
  mkdirSync(join(dest, '.claude/skills/klappe'), { recursive: true });
  mkdirSync(join(dest, '.claude/skills/mine'), { recursive: true });
  writeFileSync(join(dest, '.claude/skills/klappe/old-page.md'), 'stale');
  writeFileSync(join(dest, '.claude/skills/mine/SKILL.md'), 'keep');

  syncClaude(src, dest);

  expect(existsSync(join(dest, '.claude/skills/klappe/old-page.md'))).toBe(false);
  expect(readFileSync(join(dest, '.claude/skills/klappe/SKILL.md'), 'utf8')).toBe('new');
  expect(readFileSync(join(dest, '.claude/skills/mine/SKILL.md'), 'utf8')).toBe('keep');
});

// The agents say `npm run walk -- --only <section>/<scene>`: a deck repo made before that script gets it on sync.
test('adds the walk and review:wait scripts to a deck repo that lacks it, and keeps one the author wrote', () => {
  const src = mkdtempSync(join(tmpdir(), 'src-'));
  const dest = mkdtempSync(join(tmpdir(), 'dest-'));
  writeFileSync(join(dest, 'package.json'), JSON.stringify({ name: 'talks', scripts: { test: 'node klappe/bin/klappe.mjs test' } }, null, 2) + '\n');
  syncClaude(src, dest);
  const scripts = () => JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8')).scripts;
  expect(scripts()).toEqual({
    test: 'node klappe/bin/klappe.mjs test',
    walk: 'node klappe/bin/klappe.mjs test',
    'review:wait': 'node klappe/bin/klappe.mjs review-wait',
  });
  writeFileSync(join(dest, 'package.json'), JSON.stringify({ scripts: { walk: 'my own', 'review:wait': 'mine too' } }));
  syncClaude(src, dest);
  expect(scripts()).toEqual({ walk: 'my own', 'review:wait': 'mine too' });
  const bare = mkdtempSync(join(tmpdir(), 'dest-'));
  syncClaude(src, bare); // no package.json: nothing to add to
  expect(existsSync(join(bare, 'package.json'))).toBe(false);
});
