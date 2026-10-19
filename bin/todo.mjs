// Lists the media/ and data/ files that scene.md files link to but the deck lacks.
// Writes media/TODO.md and data/TODO.md; removes a TODO file when nothing is missing.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const IMAGE = /\.(png|jpe?g|gif|webp|svg)$/i;
// Added to a prompt made from alt text, so a generated picture fits a full slide. An explicit title stays as written.
const SHAPE = ', 16:9, 1920x1080, no text, no logos';

function scenes(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const p = join(dir, e.name);
    if (e.isDirectory()) scenes(p, out);
    else if (e.name === 'scene.md') out.push(p);
  }
  return out;
}

export function writeTodos(deckDir) {
  const lines = { media: [], data: [] };
  const seen = new Set();
  const root = join(deckDir, 'sections');
  for (const file of existsSync(root) ? scenes(root) : []) {
    const text = readFileSync(file, 'utf8');
    const rel = relative(deckDir, file).replaceAll('\\', '/');
    const heading = /^#{1,6}\s+(.+?)\s*$/m.exec(text)?.[1] ?? rel.split('/').at(-2);
    // [label](href "title") or ![alt](href "title"), with href inside media/ or data/
    for (const m of text.matchAll(/\[([^\]]*)\]\(\s*(?:\.\/)?((media|data)\/[^\s)]+)(?:\s+"([^"]*)")?\s*\)/g)) {
      const [, label, href, kind, title] = m;
      if (seen.has(href) || existsSync(join(deckDir, href))) continue;
      seen.add(href);
      lines[kind].push(
        kind === 'media' && IMAGE.test(href)
          ? `- [ ] ${href} — prompt: ${title || label} for a presentation scene about ${heading}${title ? '' : SHAPE}`
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
