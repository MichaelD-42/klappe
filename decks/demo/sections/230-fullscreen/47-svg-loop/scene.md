## An animated SVG file

> An SVG with its own CSS or SMIL animation plays like a video background: only on screen, still with reduced motion. Its style can use the theme tokens.

- scene.ts { background: { href: "media/rings.svg" } } — the file animates itself
- klappe inlines it, sanitised, in a shadow root; a still SVG stays a picture
