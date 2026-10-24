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
