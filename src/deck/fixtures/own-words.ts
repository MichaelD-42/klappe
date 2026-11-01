import twoScenes from "./two-scenes";

// A French deck with its own words for klappe's UI (strings.json); one key klappe lacks.
export default () => {
  const r = twoScenes();
  r.deck.meta.lang = "fr";
  r.deck.strings = '{ "next": "Suivant", "previous": "Précédent", "upNext": "Ensuite", "nope": "x" }';
  return r;
};
