#!/usr/bin/env node
// Copies klappe/.claude/{agents,skills} klappe* entries into <deckRepo>/.claude/, overwriting them.
import { cpSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function syncClaude(srcRoot, destRoot) {
  const copied = [];
  for (const kind of ['agents', 'skills']) {
    const src = join(srcRoot, '.claude', kind);
    if (!existsSync(src)) continue;
    const dest = join(destRoot, '.claude', kind);
    mkdirSync(dest, { recursive: true });
    for (const name of readdirSync(src).filter((n) => n.startsWith('klappe'))) {
      cpSync(join(src, name), join(dest, name), { recursive: true, force: true });
      copied.push(`${kind}/${name}`);
    }
  }
  return copied;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Run from the deck repo root; the framework sits in ./klappe/.
  const here = fileURLToPath(new URL('..', import.meta.url));
  console.log(syncClaude(here, process.cwd()).join('\n'));
}
