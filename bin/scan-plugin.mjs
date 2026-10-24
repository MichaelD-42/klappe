import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

// Scans the deck's code at build time, for three virtual modules (see klappeScan).
// icon(ctx, "rocket", …) looks names up in "virtual:klappe-icons": only the icons that stand in the code as
// string literals are bundled. A computed name is not found: pass the icon itself
// (import { Rocket } from "klappe/fx/lucide").
const ICONS = 'virtual:klappe-icons'
const FX = 'virtual:klappe-fx'
const LANGS = 'virtual:klappe-langs'
const CODE = /\.(?:[cm]?[jt]sx?)$/
const LITERAL = /["'`]([A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*)["'`]/g

// grid-2x2 -> Grid2x2: the same key icons.ts looks up.
export const iconKey = (name) => name.replace(/(^|-)(\w)/g, (_, _dash, c) => c.toUpperCase())

// Every export name of lucide's ESM entry (aliases included) -> its icon file.
function lucideFiles(from) {
  const pkg = createRequire(path.join(from, 'package.json')).resolve('lucide/package.json')
  const entry = path.join(path.dirname(pkg), JSON.parse(fs.readFileSync(pkg, 'utf8')).module) // the ESM entry, not main
  const dir = path.dirname(entry)
  const files = new Map()
  for (const m of fs.readFileSync(entry, 'utf8').matchAll(/export \{([^}]+)\} from '(\.\/icons\/[^']+)'/g))
    for (const [, name] of m[1].matchAll(/default as (\w+)/g)) files.set(name, path.join(dir, m[2]))
  return files
}

function codeFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) codeFiles(p, out)
    else if (CODE.test(e.name)) out.push(p)
  }
  return out
}

// The Lucide keys named in the code under dirs, sorted.
export function namedIcons(dirs, files) {
  const keys = new Set()
  for (const f of dirs.flatMap((d) => codeFiles(d)))
    for (const [, s] of fs.readFileSync(f, 'utf8').matchAll(LITERAL)) {
      const k = iconKey(s)
      if (files.has(k)) keys.add(k)
    }
  return [...keys].sort()
}

// The names deck code imports from "klappe/fx" ("*" for a namespace import), sorted.
export function importedFx(dirs) {
  const names = new Set()
  for (const f of dirs.flatMap((d) => codeFiles(d))) {
    const text = fs.readFileSync(f, 'utf8')
    for (const [, type, list] of text.matchAll(/import\s*(type\s+)?\{([^}]*)\}\s*from\s*["']klappe\/fx["']/g))
      for (const n of type ? [] : list.split(',')) {
        const m = /^\s*(?:type\s+)?(\w+)/.exec(n)
        if (m && !/^\s*type\s/.test(n)) names.add(m[1])
      }
    if (/import\s*\*\s*as\s+\w+\s+from\s*["']klappe\/fx["']/.test(text)) names.add('*')
  }
  return [...names].sort()
}

// The languages deck code names as a literal lang value (code(ctx, { lang: "ts" })), sorted.
export function usedLangs(dirs) {
  const langs = new Set()
  for (const f of dirs.flatMap((d) => codeFiles(d)))
    for (const [, l] of fs.readFileSync(f, 'utf8').matchAll(/\blang\s*:\s*["'`]([\w+#-]+)["'`]/g)) langs.add(l)
  return [...langs].sort()
}

// Three virtual modules from one scan of the code:
// - "virtual:klappe-icons": the Lucide icons named in deckDir and extraDirs (klappe's test fixtures).
// - "virtual:klappe-fx": the effects deckDir's code imports, so main.ts loads Shiki only for a deck that shows code.
// - "virtual:klappe-langs": the languages deckDir's code passes to code(), so only their grammars load.
export function klappeScan({ klappeDir, deckDir, extraDirs = [] }) {
  const files = lucideFiles(klappeDir)
  const all = [deckDir, ...extraDirs]
  const sources = {
    [ICONS]: () => {
      const keys = namedIcons(all, files)
      const imports = keys.map((k, i) => `import i${i} from ${JSON.stringify(files.get(k).split(path.sep).join('/'))};`)
      return `${imports.join('\n')}\nexport default { ${keys.map((k, i) => `${JSON.stringify(k)}: i${i}`).join(', ')} };\n`
    },
    [FX]: () => `export default ${JSON.stringify(importedFx([deckDir]))};\n`,
    [LANGS]: () => `export default ${JSON.stringify(usedLangs([deckDir]))};\n`,
  }
  const last = {}
  return {
    name: 'klappe-scan',
    resolveId: (id) => (id in sources ? '\0' + id : undefined),
    load(id) {
      const key = id.slice(1)
      if (id.startsWith('\0') && key in sources) return (last[key] = sources[key]())
    },
    // In dev, a new icon name or effect import in a scene reloads the page with it in.
    configureServer(server) {
      const update = (file) => {
        if (!CODE.test(file) || !all.some((d) => !path.relative(d, file).startsWith('..'))) return
        let changed = false
        for (const [key, source] of Object.entries(sources)) {
          if (!(key in last)) continue
          const next = source()
          if (next === last[key]) continue
          last[key] = next
          changed = true
          const mod = server.moduleGraph.getModuleById('\0' + key)
          if (mod) server.moduleGraph.invalidateModule(mod)
        }
        if (changed) server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('change', update)
      server.watcher.on('add', update)
    },
  }
}
