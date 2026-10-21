import { assembleDeck } from "../assemble";

// Many sections, one canvas each, with 1 to 9 scenes and titles of mixed length, like a full training day.
const files: Record<string, string> = { "deck.md": "---\ntitle: Fixture\n---\n" };
for (let i = 0; i < 20; i++) {
  const sec = `sections/${100 + i * 10}-s${i}`;
  files[`${sec}/section.md`] = `# Section ${i + 1}\n`;
  for (let j = 0; j < 1 + ((i * 4) % 9); j++)
    files[`${sec}/${100 + j * 10}-c${j}/scene.md`] = `## ${j % 3 ? `Scene ${j + 1}` : `Scene ${j + 1} with a title long enough to wrap`} of ${i + 1}\n\n- Step 1.\n`;
}
export default () => assembleDeck(files, {});
