import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { expect, test } from 'vitest';
// @ts-expect-error plain .mjs, no types
import { writeTodos } from '../../bin/todo.mjs';

const deck = () => {
  const d = mkdtempSync(join(tmpdir(), 'todo-'));
  mkdirSync(join(d, 'sections/10-a/10-one'), { recursive: true });
  mkdirSync(join(d, 'media'));
  writeFileSync(join(d, 'media/here.png'), 'x');
  writeFileSync(
    join(d, 'sections/10-a/10-one/scene.md'),
    [
      '## The engine',
      '',
      '- ![An engine](media/engine.png "A cutaway of an engine")',
      '- ![Here](media/here.png)',
      '- [Sales](data/sales.csv)',
      '- ![No title](./media/plain.png)',
      '- [Site](https://example.com/media/x.png)',
      '',
    ].join('\n'),
  );
  return d;
};

test('writeTodos lists missing media and data files with exact lines', () => {
  const d = deck();
  writeTodos(d);
  expect(readFileSync(join(d, 'media/TODO.md'), 'utf8')).toBe(
    [
      '- [ ] media/engine.png — prompt: A cutaway of an engine for a presentation scene about The engine',
      '- [ ] media/plain.png — prompt: No title for a presentation scene about The engine, 16:9, 1920x1080, no text, no logos',
      '',
    ].join('\n'),
  );
  expect(readFileSync(join(d, 'data/TODO.md'), 'utf8')).toBe(
    '- [ ] data/sales.csv — needed by sections/10-a/10-one/scene.md\n',
  );
});

test('writeTodos takes a relative deck dir with a trailing slash; a video gets no prompt', () => {
  const d = deck();
  writeFileSync(join(d, 'sections/10-a/10-one/scene.md'), '## T\n\n- [A clip](media/clip.webm)\n');
  const cwd = process.cwd();
  process.chdir(tmpdir());
  try {
    writeTodos(basename(d) + '/');
  } finally {
    process.chdir(cwd);
  }
  expect(readFileSync(join(d, 'media/TODO.md'), 'utf8')).toBe(
    '- [ ] media/clip.webm — needed by sections/10-a/10-one/scene.md\n',
  );
});

test('writeTodos removes a TODO file when nothing is missing', () => {
  const d = deck();
  writeTodos(d);
  for (const f of ['engine.png', 'plain.png']) writeFileSync(join(d, 'media', f), 'x');
  mkdirSync(join(d, 'data'), { recursive: true });
  writeFileSync(join(d, 'data/sales.csv'), 'a\n1\n');
  writeTodos(d);
  expect(existsSync(join(d, 'media/TODO.md'))).toBe(false);
  expect(existsSync(join(d, 'data/TODO.md'))).toBe(false);
});

test('clampPose keeps a Ken Burns drift inside the overscan', async () => {
  const { clampPose } = await import('../../src/fx/media');
  const rect = { x: 0, y: 0, w: 1920, h: 1080 };
  const pose = (scale: number, x: number, y: number) => {
    const p = clampPose({ scale, x, y }, rect);
    return [p.scale, p.x, p.y].map((v) => Math.round(v * 100) / 100 + 0); // + 0 turns -0 into 0
  };
  expect(pose(1, -24, -12)).toEqual([1, 0, 0]);
  expect(pose(1.08, -24, -12)).toEqual([1.08, -24, -12]);
  expect(pose(1.02, 100, -100)).toEqual([1.02, 19.2, -10.8]);
});
