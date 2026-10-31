// Lists the media/ and data/ files that a deck's scene.md, scene.ts and section.ts files name but the deck lacks.
// Writes media/TODO.md and data/TODO.md; removes a TODO file when nothing is missing.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const IMAGE = /\.(png|jpe?g|gif|webp|svg)$/i;
// Added to a prompt made from alt text, so a generated picture fits where it shows. An explicit title stays as written.
// A scene.md image shows in the default renderer's right column, about 806x799: near square.
const COLUMN = ', square, 1024x1024, no text, no logos';
// A scene.ts or section.ts image is a full-frame picture or a background, in the deck.md frame. Same string as
// fullFramePrompt in src/fx/media.ts (this script cannot import TS); tests/unit/fx-media.test.ts checks that they match.
const FRAMES = { '16:9': '1920x1080', '4:3': '1440x1080', '1:1': '1080x1080', '9:16': '1080x1920' };
export const fullFrame = (frame = '16:9') => `, ${frame}, ${FRAMES[frame] ?? FRAMES['16:9']}, no text, no logos`;

const SOURCES = ['scene.md', 'scene.ts', 'section.ts'];
function sources(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const p = join(dir, e.name);
    if (e.isDirectory()) sources(p, out);
    else if (SOURCES.includes(e.name)) out.push(p);
  }
  return out;
}

// [label](href "title") or ![alt](href "title"), with href inside media/ or data/
function markdownLinks(text) {
  return [...text.matchAll(/\[([^\]]*)\]\(\s*(?:\.\/)?((media|data)\/[^\s)]+)(?:\s+"([^"]*)")?\s*\)/g)].map(
    ([, label, href, kind, title]) => ({ href, kind, prompt: title || label, suffix: title ? '' : COLUMN }),
  );
}

// href: or media: "media/x.png" in an object literal, with alt: "..." from the same literal. One level of nested
// literals (rect: { ... }) may sit beside them.
// shortcut: a regex, not a parser; an href built at run time or nested deeper is not found.
function codeLinks(text, suffix) {
  const obj = /\{(?:[^{}]|\{[^{}]*\})*?\b(?:href|media):\s*["'`](?:\.\/)?((media|data)\/[^"'`]+)["'`](?:[^{}]|\{[^{}]*\})*\}/g;
  return [...text.matchAll(obj)].map(([obj, href, kind]) => {
    const alt = /\balt:\s*["'`]([^"'`]*)["'`]/.exec(obj)?.[1];
    return { href, kind, prompt: alt, suffix };
  });
}

export function writeTodos(deckDir) {
  const lines = { media: [], data: [] };
  const seen = new Set();
  const root = join(deckDir, 'sections');
  const deckMd = join(deckDir, 'deck.md');
  const frame = /^frame:\s*(\S+)\s*$/m.exec(existsSync(deckMd) ? readFileSync(deckMd, 'utf8') : '')?.[1];
  const full = fullFrame(frame in FRAMES ? frame : undefined);
  for (const file of existsSync(root) ? sources(root) : []) {
    const text = readFileSync(file, 'utf8');
    const rel = relative(deckDir, file).replaceAll('\\', '/');
    const md = join(dirname(file), file.endsWith('section.ts') ? 'section.md' : 'scene.md'); // holds the heading
    const heading = /^#{1,6}\s+(.+?)\s*$/m.exec(existsSync(md) ? readFileSync(md, 'utf8') : '')?.[1] ?? rel.split('/').at(-2);
    for (const { href, kind, prompt, suffix } of file.endsWith('.md') ? markdownLinks(text) : codeLinks(text, full)) {
      if (seen.has(href) || existsSync(join(deckDir, href))) continue;
      seen.add(href);
      lines[kind].push(
        kind === 'media' && IMAGE.test(href) && prompt !== undefined
          ? `- [ ] ${href} — prompt: ${prompt} for a presentation scene about ${heading}${suffix}`
          : `- [ ] ${href} — needed by ${rel}`,
      );
    }
  }
  for (const kind of ['media', 'data']) {
    const todo = join(deckDir, kind, 'TODO.md');
    if (lines[kind].length) {
      mkdirSync(join(deckDir, kind), { recursive: true });
      writeFileSync(todo, lines[kind].join('\n') + '\n');
    } else rmSync(todo, { force: true });
  }
}
