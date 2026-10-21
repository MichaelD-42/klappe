import { assembleDeck } from "../assemble";

// The four Markdown parts of M3 in plain scene.md files, all built now. The cobol fence shows plain and reports that its language is not bundled.
const f = "```";
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-code/scene.md": `## Code\n\n${f}ts {1|2-3}\nconst a = 1;\nconst b = 2;\nconsole.log(a + b);\n${f}\n\n- One constant.\n- The sum.\n`,
      "sections/10-a/20-plain/scene.md": `## Plain\n\n${f}cobol\nDISPLAY 'HELLO'.\n${f}\n\n- A language without highlighting.\n`,
      "sections/10-a/30-console/scene.md": `## Console\n\n${f}console\n$ npm test\nok\n$ npm run build\ndone\n${f}\n\n- Test.\n- Build.\n`,
      "sections/10-a/40-check/scene.md": "## Checklist\n\n- [x] Backup verified\n- [ ] Restore tested\n",
      "sections/10-a/50-agenda/scene.md": "## Agenda\n\n- 09:00–09:45 Basics\n- 09:45–10:30 Practice ←\n- 10:30–11:00 Wrap-up\n",
    },
    {},
  );
