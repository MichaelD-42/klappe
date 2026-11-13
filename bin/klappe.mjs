#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { REVIEW_WAIT, syncClaude, WALK } from './sync-claude.mjs'

const klappeDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [cmd, ...rest] = process.argv.slice(2)
const i = rest.lastIndexOf('--deck') // the last one wins, so `npm run dev -- --deck x` overrides the script's
const decksDir = path.join(process.cwd(), 'decks')

if (cmd === '--version' || cmd === '-v') {
  console.log(JSON.parse(fs.readFileSync(path.join(klappeDir, 'package.json'), 'utf8')).version)
  process.exit(0)
}

const usage =
  'usage: klappe dev [--deck <id>] [--port <n>] [--strictPort]\n' +
  '       klappe build|outline|init [--deck <id>]\n' +
  '       klappe outline --story   one line per scene: its link and story point\n' +
  '       klappe outline|pdf|video|test --cut <name>   a deck.md cut instead of the whole deck\n' +
  '       klappe outline|pdf|shot|video|test --lang <code>   the deck in a language from its lang/<code>.md\n' +
  '       klappe lang <code> [--deck <id>]   writes or updates lang/<code>.md from the deck, for translating\n' +
  '       klappe pdf [--deck <id>] [--handout] [--width <px>] [--quality <1-100>]\n' +
  '       klappe test [--deck <id>] [--only <section>[/<scene>]] [--bail] [--strict] [<vitest file filter>] [-t <name>]\n' +
  '       klappe theme [--deck <id>] --name <name> --colors <hex>,<hex> [--light] [--logo <file.svg|png>] [--force]\n' +
  '       klappe shot [--deck <id>] [<section>[/<scene>[/<step>]] ...] [--last] [--sheet] [--theme <name>] [--size <w>x<h>] [--at <ms>] [--url <dev server>]\n' +
  '       klappe video [--deck <id>] [--out <file.mp4>] [--fps <n>] [--hold <s>] [--size <w>x<h>] [--only <section>[/<scene>]]   needs ffmpeg on PATH\n' +
  '       klappe review-wait [--deck <id>]   waits until review.md has findings sent to Claude, then lists their steps\n' +
  '       klappe --version'
// --help on a command too: shot took it for nothing and rendered the whole deck.
if ([cmd, ...rest].some((a) => a === '--help' || a === '-h')) {
  console.log(usage)
  process.exit(0)
}
if (!['dev', 'build', 'test', 'pdf', 'shot', 'video', 'outline', 'init', 'theme', 'review-wait', 'lang'].includes(cmd)) {
  console.error(usage)
  process.exit(1)
}

let id = i >= 0 ? rest[i + 1] : undefined
if (i >= 0 && (!id || id.startsWith('-'))) {
  console.error('--deck needs an id')
  process.exit(1)
}

if (cmd === 'init') {
  if (!id || !/^[a-z0-9][a-z0-9-]*$/i.test(id)) {
    console.error('usage: klappe init --deck <id>  (letters, digits, dashes)')
    process.exit(1)
  }
  if (path.relative(process.cwd(), klappeDir) === '') { // not ===: Windows paths differ in case
    console.error('Run init in the deck repo root, not in the klappe folder.')
    process.exit(1)
  }
  const dir = path.join(decksDir, id)
  if (fs.existsSync(dir)) {
    console.error(`Deck already exists: ${dir}. Nothing changed.`)
    process.exit(1)
  }
  // Parse package.json first so a bad file leaves nothing half-made.
  const pkgFile = path.join(process.cwd(), 'package.json')
  let pkg = { name: 'deck-repo', private: true }
  if (fs.existsSync(pkgFile)) {
    try {
      pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'))
    } catch (e) {
      console.error(`Cannot parse ${pkgFile}: ${e.message}. Nothing changed.`)
      process.exit(1)
    }
  }
  if (pkg.devDependencies?.klappe !== undefined) {
    delete pkg.devDependencies.klappe
    console.log('Moved klappe from devDependencies to dependencies.')
  }
  pkg.dependencies = { ...pkg.dependencies, klappe: 'file:./klappe' }
  const wanted = {
    dev: 'node klappe/bin/klappe.mjs dev',
    build: 'node klappe/bin/klappe.mjs build',
    test: 'node klappe/bin/klappe.mjs test',
    walk: WALK, // the agents' scene walk; the klappe repo has it too, where test is vitest
    'review:wait': REVIEW_WAIT,
    pdf: 'node klappe/bin/klappe.mjs pdf',
    shot: 'node klappe/bin/klappe.mjs shot',
    video: 'node klappe/bin/klappe.mjs video',
    outline: 'node klappe/bin/klappe.mjs outline',
    'klappe:sync': 'node klappe/bin/sync-claude.mjs',
  }
  pkg.scripts ??= {}
  for (const [k, v] of Object.entries(wanted)) {
    if (pkg.scripts[k] === undefined || pkg.scripts[k] === v) pkg.scripts[k] = v
    else console.log(`Kept your script "${k}": ${pkg.scripts[k]}\n  klappe expects: ${v}`)
  }
  // The starter deck from template/: one scene, so a fresh deck shows a step and its tests pass. {{id}} is the deck id.
  fs.cpSync(path.join(klappeDir, 'template'), dir, { recursive: true })
  for (const f of ['deck.md', 'README.md']) {
    const file = path.join(dir, f)
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replaceAll('{{id}}', id))
  }
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n')
  const tsconfig = path.join(process.cwd(), 'tsconfig.json')
  if (!fs.existsSync(tsconfig)) {
    const ts = {
      compilerOptions: {
        strict: true,
        noEmit: true,
        types: ['vite/client'],
        paths: { 'klappe/types': ['./klappe/src/types'], 'klappe/fx': ['./klappe/src/fx'], 'klappe/fx/*': ['./klappe/src/fx/*'] },
      },
      include: ['decks'],
    }
    fs.writeFileSync(tsconfig, JSON.stringify(ts, null, 2) + '\n')
  }
  const ignore = path.join(process.cwd(), '.gitignore')
  if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, 'node_modules/\ndist/\n')
  const synced = syncClaude(klappeDir, process.cwd())
  console.log(`Created decks/${id}. Synced: ${synced?.join(', ') || 'nothing'}`)
  process.exit(0)
}
if (!id) {
  const ids = fs.existsSync(decksDir)
    ? fs.readdirSync(decksDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : []
  if (ids.length !== 1) {
    console.error(`Cannot pick a deck. Use --deck <id>. Choices: ${ids.join(', ') || '(none in ' + decksDir + ')'}`)
    process.exit(1)
  }
  id = ids[0]
}
const deckDir = path.join(decksDir, id)
if (!fs.existsSync(deckDir)) {
  console.error(`Deck not found: ${deckDir}`)
  process.exit(1)
}

if (cmd === 'theme') {
  // Colour 1 is the accent and sets the hue of the page; colour 2 is the second accent. Dark unless --light.
  const arg = (flag) => (rest.includes(flag) ? rest[rest.lastIndexOf(flag) + 1] : undefined)
  const { writeTheme } = await import('./theme.mjs')
  try {
    const opts = { name: arg('--name'), colors: arg('--colors'), logo: arg('--logo'), light: rest.includes('--light'), force: rest.includes('--force') }
    for (const line of await writeTheme(klappeDir, deckDir, opts)) console.log(line)
    process.exit(0)
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}

process.env.KLAPPE_DECK_DIR = deckDir

// --cut <name>: a cut from deck.md cuts; outline, pdf, video and test follow it. An unknown name stops before a server starts.
const cut = rest.includes('--cut') ? rest[rest.lastIndexOf('--cut') + 1] : undefined
if (cut !== undefined) {
  const cuts = (await (await import('./outline.mjs')).outline(klappeDir, deckDir)).deck.meta.cuts ?? {}
  if (!cut || cut.startsWith('-') || !cuts[cut]) {
    console.error(`--cut needs a cut from deck.md cuts: ${Object.keys(cuts).join(', ') || '(none)'}`)
    process.exit(1)
  }
}
// --lang <code>: the deck in a language it has a lang/<code>.md for; outline, pdf, shot, video and test follow it.
const lang = rest.includes('--lang') ? rest[rest.lastIndexOf('--lang') + 1] : undefined
if (lang !== undefined) {
  const languages = (await (await import('./outline.mjs')).outline(klappeDir, deckDir)).deck.meta.languages ?? []
  if (!lang || lang.startsWith('-') || !languages.includes(lang)) {
    console.error(`--lang needs a language the deck has: ${languages.join(', ')}`)
    process.exit(1)
  }
}
// The deck's URL on a server, with the cut and the language.
const query = new URLSearchParams({ ...(cut && { cut }), ...(lang && { lang }) }).toString()
const deckUrl = (server) => `${server.resolvedUrls.local[0]}${query ? `?${query}` : ''}`
// Exported files carry the cut and the language in their name, so they never overwrite the whole talk's.
const suffix = `${cut ? `-${cut}` : ''}${lang ? `-${lang}` : ''}`
if (cmd === 'lang') {
  const code = rest[0]
  if (!code || !/^[a-z]{2,3}(?:-[A-Za-z0-9]+)*$/.test(code)) {
    console.error('usage: klappe lang <code> [--deck <id>], for example klappe lang de')
    process.exit(1)
  }
  try {
    const r = await (await import('./lang.mjs')).writeLangFile(klappeDir, deckDir, code)
    console.log(`Wrote ${path.relative(process.cwd(), r.file)}: ${r.texts} texts, ${r.open} to translate${r.stale ? `, ${r.stale} stale` : ''}.`)
    process.exit(0)
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}
if (cmd === 'review-wait') {
  // Claude runs this in the background while the author reviews: it ends when there is work. vite loads the .ts.
  const { runnerImport } = await import('vite')
  const { module } = await runnerImport(path.join(klappeDir, 'src/review/file.ts'))
  const { waitForReady } = await import('./review-wait.mjs')
  const file = process.env.KLAPPE_REVIEW_FILE ?? path.join(deckDir, 'review.md')
  const steps = await waitForReady(file, module.readyFindings)
  console.log(`Ready for Claude in ${path.relative(process.cwd(), file)}:\n${steps.join('\n')}`)
  process.exit(0)
}

// Lists missing media and data files in the deck. bin/todo.mjs may be absent; then this does nothing.
async function writeTodos() {
  const file = path.join(klappeDir, 'bin', 'todo.mjs')
  if (fs.existsSync(file)) await (await import(pathToFileURL(file).href)).writeTodos(deckDir)
}
if (cmd === 'build' || cmd === 'test') await writeTodos()

if (cmd === 'test') {
  // --only <section>[/<scene>] (repeat it, or join with commas) walks those scenes alone, at the 3 sizes, and prints
  // their look warnings. --bail stops at the first failure, in the walk at the first failing step. --strict fails the
  // walk on look warnings. Other words go to vitest: a file filter (`fx-chart`, relative to klappe/), `-t <test name>`.
  const only = rest.flatMap((a, k) => (rest[k - 1] === '--only' ? a.split(',') : [])).filter(Boolean)
  if (rest.includes('--only') && !only.length) {
    console.error('--only needs <section>[/<scene>], as in a deep link')
    process.exit(1)
  }
  const bail = rest.includes('--bail')
  const strict = rest.includes('--strict')
  const own = new Set(['--deck', '--only', '--cut', '--lang'])
  const args = rest.filter((a, k) => !own.has(a) && !own.has(rest[k - 1]) && a !== '--bail' && a !== '--strict')
  if (only.length) process.env.KLAPPE_ONLY = only.join(',')
  if (bail) process.env.KLAPPE_BAIL = '1'
  if (strict) process.env.KLAPPE_STRICT = '1'
  if (cut) process.env.KLAPPE_CUT = cut
  if (lang) process.env.KLAPPE_LANG = lang
  // Deck problems the parser finds (a duplicate id) stop the run before a browser starts: --only would not see them.
  const { outline, overWords, walkedScenes } = await import('./outline.mjs')
  const { problems, deck } = await outline(klappeDir, deckDir, { cut: cut ?? null, lang: lang ?? null })
  for (const p of problems) console.error(`deck problem: ${p}`)
  if (problems.length) process.exit(1)
  if (only.length) {
    const { scenes, unknown } = walkedScenes(deck, only)
    for (const u of unknown) console.error(`--only ${u}: no scene matches; a target is <section> or <section>/<scene>`)
    if (unknown.length) process.exit(1)
    console.log(`walking ${scenes.length} ${scenes.length === 1 ? 'scene' : 'scenes'}: ${scenes.join(', ')}`)
  }
  // deck.md max-words: reported before the tests, fails the run after them.
  const long = await overWords(klappeDir, deckDir, lang ?? null)
  for (const l of long) console.error(`max-words: ${l}`)
  const { startVitest, parseCLI } = await import('vitest/node')
  const { filter, options } = parseCLI(['vitest', ...args])
  // A cut or a language walks alone: the other e2e tests are klappe's own fixtures and the whole demo.
  const walkOnly = only.length || cut || lang
  const vitest = await startVitest('test', walkOnly ? ['tests/e2e/walk.e2e.test.ts'] : filter, {
    ...options,
    ...(walkOnly && { testNamePattern: 'walk passes at', silent: false }), // the look report: vitest hides a passing test's log under an agent
    ...(bail && { bail: 1 }),
    root: klappeDir,
    run: true,
    project: ['e2e'],
  })
  await vitest?.close()
  process.exit(!long.length && vitest && vitest.state.getCountOfFailedTests() === 0 && !vitest.state.getUnhandledErrors().length ? 0 : 1)
}

if (cmd === 'outline') {
  const { outline } = await import('./outline.mjs')
  const r = await outline(klappeDir, deckDir, { story: rest.includes('--story'), cut: cut ?? null, lang: lang ?? null })
  for (const p of r.problems) console.warn(`deck problem: ${p}`)
  process.stdout.write(r.text)
  process.exit(0)
}

// Before a server and a browser start: klappe encodes with the system ffmpeg, not an npm package.
if (cmd === 'video' && spawnSync('ffmpeg', ['-version']).error) {
  console.error('klappe video needs ffmpeg on PATH')
  process.exit(1)
}

// Imported late: init runs before npm i, when vite is not installed yet.
const { createServer, build } = await import('vite')
const configFile = path.join(klappeDir, 'vite.config.ts')

if (cmd === 'build') {
  await build({ configFile })
} else if (cmd === 'pdf') {
  // Deck problems do not stop the export, as with build; page errors fail it, as the pages may be wrong.
  // --width: the pictures' pixels across (default 1920, 960 for a small file, 3840 for print); --quality: JPEG, default 90.
  const arg = (flag) => (rest.includes(flag) ? rest[rest.lastIndexOf(flag) + 1] : undefined)
  const width = Number(arg('--width') ?? 1920)
  const quality = Number(arg('--quality') ?? 90)
  if (!(Number.isInteger(width) && width >= 320 && width <= 7680) || !(Number.isInteger(quality) && quality >= 1 && quality <= 100)) {
    console.error('--width needs whole pixels from 320 to 7680, --quality a whole number from 1 to 100')
    process.exit(1)
  }
  const { exportPdf } = await import('./pdf.mjs')
  const server = await createServer({ configFile, server: { port: 0 }, logLevel: 'warn' })
  await server.listen()
  // --handout: one A4 page per scene with its speaker notes, to send after the talk.
  const handout = rest.includes('--handout')
  const out = path.join(process.cwd(), 'dist', `${id}${suffix}${handout ? '-handout' : ''}.pdf`)
  try {
    const r = await exportPdf(deckUrl(server), out, { handout, width, quality })
    for (const p of r.problems) console.warn(`deck problem: ${p}`)
    for (const e of r.errors) console.error(`page error: ${e}`)
    console.log(`Wrote ${out}: ${r.pages} pages.`)
    process.exitCode = r.errors.length ? 1 : 0
  } finally {
    await server.close()
  }
} else if (cmd === 'shot') {
  // Targets are the words that are neither a flag nor a flag's value.
  const valued = new Set(['--deck', '--theme', '--size', '--at', '--url', '--lang'])
  const targets = rest.filter((a, k) => !a.startsWith('-') && !valued.has(rest[k - 1]))
  const arg = (flag) => (rest.includes(flag) ? rest[rest.lastIndexOf(flag) + 1] : undefined)
  const { shoot, SIZES } = await import('./shot.mjs')
  // --size 1366x768, or a width alone for one of the two look sizes.
  const size = arg('--size')
  const m = size?.match(/^(\d+)(?:x(\d+))?$/)
  const sizes = size === undefined ? SIZES : m && (m[2] ? [{ width: +m[1], height: +m[2] }] : SIZES.filter((s) => s.width === +m[1]))
  if (!sizes?.length) {
    console.error(`--size needs <width>x<height>, or ${SIZES.map((s) => s.width).join(' or ')}`)
    process.exit(1)
  }
  const at = arg('--at')
  if (at !== undefined && !/^\d+$/.test(at)) {
    console.error('--at needs the milliseconds into the step, for example --at 400')
    process.exit(1)
  }
  // --url: a running `klappe dev` of the same deck, so each shot skips the server start.
  const url = arg('--url')
  const server = url ? null : await createServer({ configFile, server: { port: 0 }, logLevel: 'warn' })
  await server?.listen()
  const out = path.join(process.cwd(), 'dist', 'shots', `${id}${lang ? `-${lang}` : ''}`)
  try {
    const opts = { targets, last: rest.includes('--last'), sheet: rest.includes('--sheet'), theme: arg('--theme'), lang, sizes, at: at === undefined ? undefined : +at }
    const r = await shoot(url ?? server.resolvedUrls.local[0], out, opts)
    for (const u of r.unknown) console.error(`no step matches ${u}; a target is <section>, <section>/<scene> or <section>/<scene>/<step>`)
    for (const p of r.problems) console.warn(`deck problem: ${p}`)
    for (const e of r.errors) console.error(`page error: ${e}`)
    for (const f of [...r.files, ...r.sheets]) console.log(path.relative(process.cwd(), f))
    process.exitCode = r.unknown.length || r.errors.length ? 1 : 0
  } finally {
    await server?.close()
  }
} else if (cmd === 'video') {
  // Page errors fail the export, as in pdf. --size is the viewport; a frame other than 16:9 keeps its shape at that width.
  const arg = (flag) => (rest.includes(flag) ? rest[rest.lastIndexOf(flag) + 1] : undefined)
  const fps = Number(arg('--fps') ?? 30)
  const hold = Number(arg('--hold') ?? 3)
  const m = (arg('--size') ?? '1920x1080').match(/^(\d+)x(\d+)$/)
  if (!(Number.isInteger(fps) && fps > 0) || !(hold >= 0) || !m) {
    console.error('--fps needs a whole number above 0, --hold seconds (0 or more), --size <width>x<height>')
    process.exit(1)
  }
  // --only <section>[/<scene>], as for test: those scenes alone, checked against the deck before a browser starts. The
  // default file is named after them, so it never overwrites the whole talk's.
  const only = rest.flatMap((a, k) => (rest[k - 1] === '--only' ? a.split(',') : [])).filter(Boolean)
  if (rest.includes('--only') && !only.length) {
    console.error('--only needs <section>[/<scene>], as in a deep link')
    process.exit(1)
  }
  if (only.length) {
    const { outline, walkedScenes } = await import('./outline.mjs')
    const { unknown } = walkedScenes((await outline(klappeDir, deckDir, { cut: cut ?? null, lang: lang ?? null })).deck, only)
    for (const u of unknown) console.error(`--only ${u}: no scene matches; a target is <section> or <section>/<scene>`)
    if (unknown.length) process.exit(1)
  }
  const { exportVideo } = await import('./video.mjs')
  const server = await createServer({ configFile, server: { port: 0 }, logLevel: 'warn' })
  await server.listen()
  const part = only.length ? `-${only.map((t) => t.replace(/^#?\/?/, '').replace(/\//g, '-')).join('_')}` : ''
  const out = path.resolve(arg('--out') ?? path.join('dist', `${id}${suffix}${part}.mp4`))
  // Ctrl-C stops ffmpeg and the browser and drops the partial file, instead of leaving a short video at out.
  const stop = new AbortController()
  process.once('SIGINT', () => stop.abort())
  try {
    const r = await exportVideo(deckUrl(server), out, { fps, hold, size: { width: +m[1], height: +m[2] }, signal: stop.signal, only: only.length ? only : undefined })
    for (const p of r.problems) console.warn(`deck problem: ${p}`)
    for (const e of r.errors) console.error(`page error: ${e}`)
    console.log(`Wrote ${out}: ${r.frames} frames, ${(r.frames / fps).toFixed(1)} s.`)
    process.exitCode = r.errors.length ? 1 : 0
  } catch (e) {
    console.error(`klappe video: ${e.message.split('\n')[0]}`)
    process.exitCode = stop.signal.aborted ? 130 : 1
  } finally {
    await server.close()
  }
} else {
  // --port and --strictPort, as Vite's own CLI takes them: several builders run one server each.
  const port = rest.includes('--port') ? Number(rest[rest.lastIndexOf('--port') + 1]) : undefined
  if (port !== undefined && !(port > 0)) {
    console.error('--port needs a number, for example --port 5174')
    process.exit(1)
  }
  const server = await createServer({ configFile, server: { ...(port && { port }), ...(rest.includes('--strictPort') && { strictPort: true }) } })
  await server.listen()
  server.printUrls()
}
