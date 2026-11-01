import twoScenes from "./two-scenes";

// The two-scenes deck with deck.md handheld: true.
export default () => {
  const r = twoScenes();
  r.deck.meta.handheld = true;
  return r;
};
