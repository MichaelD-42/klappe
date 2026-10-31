import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { describe, expect, test } from 'vitest';
// @ts-expect-error plain .mjs, no types
import { fullFrame, writeTodos } from '../../bin/todo.mjs';
import { embed, fullFramePrompt } from '../../src/fx/media';

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
      '- [ ] media/plain.png — prompt: No title for a presentation scene about The engine, square, 1024x1024, no text, no logos',
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
  expect(pose(0.9, 50, -50)).toEqual([0.9, 0, 0]); // no overscan below scale 1: no drift
});

test('the full-frame prompt suffix is the same string in bin/todo.mjs and src/fx/media.ts, for every frame', () => {
  expect(fullFrame()).toBe(', 16:9, 1920x1080, no text, no logos');
  for (const [f, w, h] of [['16:9', 1920, 1080], ['4:3', 1440, 1080], ['1:1', 1080, 1080], ['9:16', 1080, 1920]] as const)
    expect(fullFrame(f)).toBe(fullFramePrompt({ w, h }));
});

test('writeTodos sizes a full-frame prompt to the deck.md frame', () => {
  const d = deck();
  writeFileSync(join(d, 'deck.md'), '---\ntitle: x\nframe: 9:16\n---\n');
  writeFileSync(join(d, 'sections/10-a/10-one/scene.ts'), 'export default { background: { href: "media/sky.png", alt: "A sky" } };\n');
  writeTodos(d);
  expect(readFileSync(join(d, 'media/TODO.md'), 'utf8')).toContain('A sky for a presentation scene about The engine, 9:16, 1080x1920, no text, no logos');
});

test('writeTodos lists media named in scene.ts and section.ts, with a 16:9 prompt from alt', () => {
  const d = deck();
  writeFileSync(join(d, 'sections/10-a/section.md'), '# The plant\n');
  writeFileSync(join(d, 'sections/10-a/section.ts'), 'export default { background: { href: "media/sky.png", alt: "A sky, at dusk", scrim: 0.6 } };\n');
  writeFileSync(
    join(d, 'sections/10-a/10-one/scene.ts'),
    [
      'export default {',
      '  background: { scrim: 0.6, href: "media/bare.png" },',
      '  build: (ctx) => ({ i: image(ctx, { alt: "A dawn sky", href: "media/hero.png", fit: "cover" }),',
      '    v: video(ctx, { href: "media/clip.mp4", title: "A clip", rect }), h: image(ctx, { href: "media/here.png", alt: "x" }) }),',
      '  more: image(ctx, { href: "media/desk.png", alt: "A desk", rect: { x: 0, y: 0, w: 1, h: 1 } }),',
      '};',
    ].join('\n'),
  );
  writeTodos(d);
  expect(readFileSync(join(d, 'media/TODO.md'), 'utf8').split('\n').slice(2)).toEqual([
    '- [ ] media/bare.png — needed by sections/10-a/10-one/scene.ts',
    '- [ ] media/hero.png — prompt: A dawn sky for a presentation scene about The engine, 16:9, 1920x1080, no text, no logos',
    '- [ ] media/clip.mp4 — needed by sections/10-a/10-one/scene.ts',
    '- [ ] media/desk.png — prompt: A desk for a presentation scene about The engine, 16:9, 1920x1080, no text, no logos',
    '- [ ] media/sky.png — prompt: A sky, at dusk for a presentation scene about The plant, 16:9, 1920x1080, no text, no logos',
    '',
  ]);
});

describe('embed', () => {
  test.each([
    ['https://youtu.be/abc_1', 'https://www.youtube.com/embed/abc_1'],
    ['https://www.youtube.com/watch?v=abc', 'https://www.youtube.com/embed/abc'],
    ['https://music.youtube.com/watch?v=abc', 'https://www.youtube.com/embed/abc'],
    ['https://www.youtube-nocookie.com/embed/abc', 'https://www.youtube-nocookie.com/embed/abc'],
    ['https://vimeo.com/123', 'https://player.vimeo.com/video/123'],
  ])('%s plays as %s', (href, url) => expect(embed(href)).toBe(url))

  test.each([
    'https://youtu.be/', // no id
    'https://www.youtube.com/@channel',
    'https://vimeo.com/channels/staff',
    'https://example.com/watch?v=abc', // not a video host
    'https://youtube.com.example.com/watch?v=abc',
  ])('%s gives no embed', (href) => expect(embed(href)).toBeNull())
});
