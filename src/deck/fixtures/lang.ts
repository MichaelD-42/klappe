import { assembleDeck } from "../assemble";

// An English deck with a German lang/de.md, shown in the language ?lang= names: scene.md text, a ctx.t string,
// and one text left untranslated ("Untranslated."), so the walk has a warning to report.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Talk\nlang: en\n---\n",
      "sections/10-a/section.md": "# Part\n",
      "sections/10-a/10-b/scene.md": "## Hello\n\n- Welcome.\n- Untranslated.\n",
      "sections/10-a/20-c/scene.md": "## Plain\n\n- Line.\n",
      "lang/de.md": "# de\n\n## deck\n\n> Talk\n\nVortrag\n\n## a\n\n> Part\n\nTeil\n\n## a/b\n\n> Hello\n\nHallo\n\n> Welcome.\n\nWillkommen.\n\n> From code\n\nAus dem Code\n\n## a/c\n\n> Plain\n\nSchlicht\n\n> Line.\n\nZeile.\n",
    },
    {
      "sections/10-a/10-b/scene.ts": {
        build(ctx: any) {
          const p = ctx.html.appendChild(document.createElement("p"));
          p.textContent = `${ctx.doc.title}|${ctx.doc.steps[0].text}|${ctx.t("From code")}`;
          p.dataset.kProbe = "";
          return {};
        },
      },
    },
    new URLSearchParams(location.search).get("lang"),
  );
