// The deck's own files. Vite hoists an eager glob into a static import, so they sit in a module of their own
// that loadDeck imports only without ?fixture=: a fixture page then loads none of the deck.

// ?inline runs the CSS through Vite, so url() resolves against the deck folder and the assets are bundled.
export const deckCss = import.meta.glob<string>("@deck/deck.css", { query: "?inline", import: "default", eager: true });
// Not review.md (the review window writes it while the deck is open) nor the TODO.md lists klappe test
// writes: none is part of the deck, and a change to one must not reload it.
export const files = import.meta.glob(["@deck/**/*.md", "!@deck/review.md", "!@deck/data/TODO.md", "!@deck/media/TODO.md"], { query: "?raw", import: "default", eager: true });
// Not a parked "_" folder's code: a half-written scene.ts there must not break the deck.
export const modules = import.meta.glob(["@deck/sections/**/*.ts", "!@deck/sections/**/_*/**"], { import: "default", eager: true });
export const data = import.meta.glob<string>(["@deck/data/*", "!@deck/data/TODO.md"], { query: "?raw", import: "default", eager: true });
export const media = import.meta.glob<string>(["@deck/media/*", "!@deck/media/TODO.md"], { query: "?url", import: "default", eager: true });
// overlay.ts at the deck root: the layer over every scene.
export const overlay = import.meta.glob("@deck/overlay.ts", { import: "default", eager: true });
// icons/*.svg: the deck's own icons on Lucide's 24 grid, used by name in icon() and iconTile().
export const icons = import.meta.glob<string>("@deck/icons/*.svg", { query: "?raw", import: "default", eager: true });
// icons/*.svg at the deck repo root, shared by its decks; a deck's own icon of the same name wins.
export const repoIcons = import.meta.glob<string>("@icons/*.svg", { query: "?raw", import: "default", eager: true });
