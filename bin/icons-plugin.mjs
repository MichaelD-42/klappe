import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

// Bundles only the Lucide icons a deck names. icon(ctx, "rocket", …) looks names up in the virtual module
// "virtual:klappe-icons"; this plugin builds it from every string literal in the deck's code (and klappe's
// test fixtures) that is a Lucide name. A computed name is not found: pass the icon itself
// (import { Rocket } from "klappe/fx/lucide").
const ID = 'virtual:klappe-icons'
const RESOLVED = '\0' + ID
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

export function klappeIcons({ klappeDir, dirs }) {
  const files = lucideFiles(klappeDir)
  const source = () => {
    const keys = namedIcons(dirs, files)
    const imports = keys.map((k, i) => `import i${i} from ${JSON.stringify(files.get(k).split(path.sep).join('/'))};`)
    return `${imports.join('\n')}\nexport default { ${keys.map((k, i) => `${JSON.stringify(k)}: i${i}`).join(', ')} };\n`
  }
  let last = ''
  return {
    name: 'klappe-icons',
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id === RESOLVED) return (last = source())
    },
    // In dev, a new icon name in a scene reloads the page with the icon in.
    configureServer(server) {
      const update = (file) => {
        if (!CODE.test(file) || !dirs.some((d) => !path.relative(d, file).startsWith('..'))) return
        const next = source()
        if (next === last) return
        last = next
        const mod = server.moduleGraph.getModuleById(RESOLVED)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('change', update)
      server.watcher.on('add', update)
    },
  }
}
