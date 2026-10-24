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
| `--k-font`, `--k-font-code` | text font; code and terminal font. klappe bundles Inter Variable (calm), Space Grotesk Variable (bold) and JetBrains Mono Variable (code, both); a theme may name any of them, or an installed font. The faces they name are loaded before the deck renders. |
| `--k-code-foreground`, `--k-code-background`, `--k-code-token-constant`, `-string`, `-comment`, `-keyword`, `-parameter`, `-function`, `-string-expression`, `-punctuation`, `-link` | syntax colours, mapped from Shiki's `css-variables` theme |
| `--k-phosphor`, `--k-phosphor-amber`, `--k-blackout` | CRT text and the blackout transition |

## Which theme is used

Set `theme: <name>` in `deck.md`. The name is looked up in this order, and the first match wins:

1. `decks/<id>/themes/<name>.css`: this deck only.
2. `themes/<name>.css` at the deck repo root: every deck in the repo.
3. `klappe/src/themes/<name>.css`: built in. klappe ships `calm` (the default navy palette) and `bold` (a lively violet and pink palette for trainings).

An unknown name shows the problem `theme "<name>" not found; using calm`. `intensity` is separate; it defaults to `bold` for the `bold` theme and `calm` otherwise.

Add `?theme=<name>` to the URL to try another theme without editing the deck.

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
