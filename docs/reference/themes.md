# Themes

A theme is a plain CSS file that sets `--k-*` custom properties on `:root` and nothing else. The token names are the contract. A theme may set any subset: `calm.css` always loads first, so every missing token falls back to calm.

## Tokens

| Token | Use |
| --- | --- |
| `--k-bg`, `--k-fg` | page background, main text |
| `--k-muted` | secondary text, captions, axis labels |
| `--k-surface` | box and panel fill (cards, lanes, code panel) |
| `--k-line` | strokes, borders, arrows, grid |
| `--k-accent`, `--k-accent-2` | emphasis and the current item; second emphasis |
| `--k-ok`, `--k-warn`, `--k-bad` | done, time running out, failure; `--k-bad` also colours the problems overlay |
| `--k-series-1` to `--k-series-6` | chart series, diagram participant colours |
| `--k-font`, `--k-font-code` | text font; code and terminal font. klappe bundles Inter Variable (calm), Space Grotesk Variable (bold) and JetBrains Mono Variable (code, both); a theme may name any of them, an installed font, or a font the deck's `deck.css` declares with `@font-face`. The faces they name are loaded before the deck renders. |
| `--k-font-heading` | the scene title font (`.k-scene h2`, so also `title()`). Every built-in theme sets it to `var(--k-font)`, so titles look as before; a theme may name another face. |
| `--k-code-foreground`, `--k-code-background`, `--k-code-token-constant`, `-string`, `-comment`, `-keyword`, `-parameter`, `-function`, `-string-expression`, `-punctuation`, `-link` | syntax colours, mapped from Shiki's `css-variables` theme |
| `--k-phosphor`, `--k-phosphor-amber`, `--k-blackout` | CRT text and the blackout transition; the CRT screen is always dark, so these stay bright in a light theme too |
| `--k-scrim` | the layer a `scrim` lays over a picture: `#000` under light text, `#fff` in a light theme |

## Which theme is used

Set `theme: <name>` in `deck.md`. The name is looked up in this order, and the first match wins:

1. `decks/<id>/themes/<name>.css`: this deck only.
2. `themes/<name>.css` at the deck repo root: every deck in the repo.
3. `klappe/src/themes/<name>.css`: built in. klappe ships seven:

| Theme | Mood | Text font |
| --- | --- | --- |
| `calm` | the default: navy, blue and mint, for a board | Inter |
| `bold` | lively violet and pink, for trainings | Space Grotesk |
| `sorbet` | dark, with soft pastels: peach, raspberry, lime and lilac on aubergine | Space Grotesk |
| `lavender` | light pastel: deep violet ink on a lilac stage, white cards | Inter |
| `daylight` | light and crisp: near-black on white, cobalt and orange, for bright rooms that wash out a dark slide | Inter |
| `forest` | dark and quiet: deep green with a warm gold accent | Inter |
| `ink` | high contrast: near-black, white type and one electric lime | Space Grotesk |

Try one with `?theme=<name>`. Each meets the contrast floors below, its code colours hold 4.5:1 on the code panel, and its chart series are checked for colour-blind readers: series 1 to 4 stay apart from each other, 5 and 6 from their neighbours. The demo's photos are dark; a deck in a light theme reads best with light pictures, as small muted text on a picture has no contrast guarantee.

An unknown name shows the problem `theme "<name>" not found; using calm`. `intensity` is separate; it defaults to `bold` for the `bold` theme and `calm` otherwise.

Add `?theme=<name>` to the URL to try another theme without editing the deck.

A theme sets tokens only. Fonts and component classes for one deck go in its optional `decks/<id>/deck.css`, which loads after the theme (see [deck.css](deck-format.md#deckcss)).

## Example

```css
/* themes/forest.css */
:root {
  --k-bg: #10241b;
  --k-fg: #e6f2ea;
  --k-muted: #a3c2b0;
  --k-surface: #1a3a2b;
  --k-line: #3f6b54;
  --k-accent: #6fe3a0;
  --k-accent-2: #ffc857;
}
```

Every token not listed here comes from calm.

## Contrast rules

At load, the resolved theme is measured on the real page. A failure is a deck problem, so `klappe test` fails on it. The messages look like `theme: --k-fg on --k-bg contrast 1.9 < 4.5`.

- `--k-fg` and `--k-muted` on `--k-bg` and on `--k-surface`: at least 4.5:1.
- `--k-accent` on `--k-bg` and on `--k-surface`: at least 3:1.
- `--k-line` on `--k-bg`: at least 3:1 (non-text contrast), and dimmer than `--k-muted`.

The design rules apply to theme files too: no cream or off-white backgrounds. Effects in `src/fx/` take every colour from these tokens, so a theme restyles them all.
