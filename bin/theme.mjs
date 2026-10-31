import fs from 'node:fs'
import path from 'node:path'
import { runnerImport } from 'vite'

// `klappe theme`: writes decks/<id>/themes/<name>.css from two brand colours; with a logo, copies it to media/ and
// puts it bottom right in overlay.ts. Returns the lines to print; throws a plain Error for a bad input.
const HEX = /^#?([\da-f]{3}|[\da-f]{6})$/i

export async function writeTheme(klappeDir, deckDir, { name, colors, logo, light = false, force = false }) {
  const pair = colors?.split(',').map((c) => HEX.test(c.trim()) && '#' + c.trim().replace('#', '').toLowerCase())
  if (pair?.length !== 2 || !pair.every(Boolean)) throw new Error('--colors needs two hex colours, for example --colors #1f5eff,#e35a22')
  if (!name || !/^[a-z0-9][a-z0-9-]*$/i.test(name)) throw new Error('--name needs a theme name (letters, digits, dashes)')
  if (logo && !/\.(svg|png)$/i.test(logo)) throw new Error('--logo needs an .svg or .png file')
  if (logo && !fs.existsSync(logo)) throw new Error(`Logo not found: ${logo}`)
  const file = path.join(deckDir, 'themes', `${name}.css`)
  if (fs.existsSync(file) && !force) throw new Error(`${file} exists. Use --force to overwrite it.`)

  const { themeCss } = (await runnerImport(path.join(klappeDir, 'src/brand-theme.ts'), { configFile: false, logLevel: 'error' })).module
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, themeCss(name, pair, light))
  const out = [`Wrote ${path.relative(process.cwd(), file)}. Set \`theme: ${name}\` in deck.md.`]
  if (!logo) return out

  fs.mkdirSync(path.join(deckDir, 'media'), { recursive: true })
  const media = `media/${path.basename(logo)}`
  fs.copyFileSync(logo, path.join(deckDir, media))
  const title = /^title:\s*(.+?)\s*$/m.exec(fs.readFileSync(path.join(deckDir, 'deck.md'), 'utf8'))?.[1]?.replace(/^["']|["']$/g, '') ?? ''
  // Effects start hidden: update shows them, as the documented example does.
  const overlay = `import { gsap } from "gsap";
import { image, text } from "klappe/fx";
import type { OverlayModule } from "klappe/types";

export default {
  build: (ctx) => ({
    logo: image(ctx, { href: ${JSON.stringify(media)}, alt: ${JSON.stringify(title ? `${title} logo` : 'Logo')}, rect: { x: ctx.rect.w - 64 - 176, y: ctx.rect.h - 48 - 50, w: 176, h: 50 } }).el,
    footer: text(ctx, { text: ${JSON.stringify(title)}, x: 64, y: ctx.rect.h - 48 - 32, w: ctx.rect.w - 64 - 176 - 64 - 24, size: 24, color: "--k-muted" }).el,
  }),
  update: (_at, r) => void gsap.set([r.logo, r.footer], { autoAlpha: 1 }),
} satisfies OverlayModule;
`
  const target = path.join(deckDir, 'overlay.ts')
  if (fs.existsSync(target)) {
    out.push(`Copied the logo to ${path.relative(process.cwd(), path.join(deckDir, media))}. ${path.relative(process.cwd(), target)} exists and was kept; use this build():\n\n${overlay}`)
  } else {
    fs.writeFileSync(target, overlay)
    out.push(`Copied the logo to ${path.relative(process.cwd(), path.join(deckDir, media))} and wrote ${path.relative(process.cwd(), target)}. Raise \`safe-area\` in deck.md to keep scenes clear of it.`)
  }
  return out
}
