#!/usr/bin/env node
// Copies klappe/.claude/{agents,skills} klappe* entries into <deckRepo>/.claude/, replacing them, so files
// that left klappe leave the deck repo too. The deck's own entries stay. Adds the walk script the agents name.
import { cpSync, mkdirSync, readdirSync, existsSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function syncClaude(srcRoot, destRoot) {
  if (resolve(srcRoot) === resolve(destRoot)) return null;
  const copied = [];
  for (const kind of ['agents', 'skills']) {
    const src = join(srcRoot, '.claude', kind);
    if (!existsSync(src)) continue;
    const dest = join(destRoot, '.claude', kind);
    mkdirSync(dest, { recursive: true });
    for (const name of readdirSync(src).filter((n) => n === 'klappe' || n.startsWith('klappe-'))) {
      rmSync(join(dest, name), { recursive: true, force: true });
      cpSync(join(src, name), join(dest, name), { recursive: true });
      copied.push(`${kind}/${name}`);
    }
  }
  // The agents walk scenes with `npm run walk -- --only …`, which the klappe repo has too; a deck repo made before
  // that script gets it here. A script the author wrote stays.
  const pkgFile = join(destRoot, 'package.json');
  if (existsSync(pkgFile)) {
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));
    if (pkg.scripts?.walk === undefined) {
      pkg.scripts = { ...pkg.scripts, walk: WALK };
      writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
      copied.push('package.json: scripts.walk');
    }
  }
  return copied;
}

export const WALK = 'node klappe/bin/klappe.mjs test';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Run from the deck repo root; the framework sits in ./klappe/.
  const here = fileURLToPath(new URL('..', import.meta.url));
  const r = syncClaude(here, process.cwd());
  console.log(r === null ? 'Source and target are the same folder. Run this from the deck repo root.' : r.length ? r.join('\n') : 'nothing to sync');
}
