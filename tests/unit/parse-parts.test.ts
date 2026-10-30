import { describe, it, expect } from "vitest";
import { parseScene } from "../../src/parse/scene";
import { parseGroups } from "../../src/fx/code";
import { fenceProblem } from "../../src/render/world";

const F = "sections/10-a/10-s";
const parse = (body: string) => parseScene(`## S\n\n${body}`, F);
const fence = (info: string, src: string) => "```" + info + "\n" + src + "\n```\n\n";

describe("parseGroups", () => {
  it("reads line groups and ranges", () => {
    expect(parseGroups("1-2|4")).toEqual([[1, 2], [4]]);
    expect(parseGroups("1,3-5 | 8")).toEqual([[1, 3, 4, 5], [8]]);
  });
});

describe("parseScene parts", () => {
  it("matches highlight groups to the items after a code fence", () => {
    const { scene, problems } = parse(fence("ts {1-2|4}", "a\nb\nc\nd") + "- First\n- Second\n");
    expect(problems).toEqual([]);
    expect(scene.fence).toEqual({ lang: "ts", src: "a\nb\nc\nd", groups: [[1, 2], [4]] });
    expect(scene.steps.map((s) => [s.text, s.part])).toEqual([
      ["First", { kind: "code", group: 0 }],
      ["Second", { kind: "code", group: 1 }],
    ]);
  });

  it("gives extra groups steps with empty text", () => {
    const { scene } = parse(fence("ts {1|2|3}", "a\nb\nc") + "- Only\n");
    expect(scene.steps.map((s) => [s.text, s.part])).toEqual([
      ["Only", { kind: "code", group: 0 }],
      ["", { kind: "code", group: 1 }],
      ["", { kind: "code", group: 2 }],
    ]);
  });

  it("keeps extra items as plain steps", () => {
    const { scene } = parse(fence("ts {1}", "a") + "- One\n- Two\n- Three\n");
    expect(scene.steps.map((s) => [s.text, s.part])).toEqual([
      ["One", { kind: "code", group: 0 }],
      ["Two", undefined],
      ["Three", undefined],
    ]);
  });

  it("makes one unfocused code step for a fence without groups", () => {
    const { scene } = parse(fence("ts", "a"));
    expect(scene.fence?.groups).toEqual([[]]);
    expect(scene.steps.map((s) => s.part)).toEqual([{ kind: "code", group: 0 }]);
  });

  it("makes one console step per $ command", () => {
    const { scene, problems } = parse(fence("console", "$ a\nout\n$ b") + "- Install\n- Run\n");
    expect(problems).toEqual([]);
    expect(scene.fence?.lang).toBe("console");
    expect(scene.steps.map((s) => [s.text, s.part])).toEqual([
      ["Install", { kind: "console", command: 0 }],
      ["Run", { kind: "console", command: 1 }],
    ]);
  });

  it("reports a console block with no $ command", () => {
    expect(parse(fence("console", "out")).problems).toEqual([`${F}/scene.md: console block has no "$ " command`]);
  });

  it("reports a second fence", () => {
    expect(parse(fence("ts", "a") + fence("js", "b")).problems).toEqual([`${F}/scene.md: one code, console or chat block per scene`]);
  });

  it("makes one chat step per message line, blank lines skipped; the items after are their text", () => {
    const { scene, problems } = parse(fence("chat", "user: Where do I start?\n\nWith the tests.\nAna: I take the changelog.") + "- Ask.\n- Answer.\n");
    expect(problems).toEqual([]);
    expect(scene.steps.map((s) => [s.text, s.part])).toEqual([
      ["Ask.", { kind: "chat", message: 0 }],
      ["Answer.", { kind: "chat", message: 1 }],
      ["", { kind: "chat", message: 2 }],
    ]);
    expect(fenceProblem("chat")).toBeNull();
  });

  it("reports a chat block with no message", () => {
    expect(parse(fence("chat", "\n")).problems).toEqual([`${F}/scene.md: chat block has no message`]);
  });

  it("reads task-list items as check parts", () => {
    const { scene } = parse("- [ ] a\n- [x] b\n");
    expect(scene.steps.map((s) => [s.text, s.part])).toEqual([
      ["a", { kind: "check", done: false }],
      ["b", { kind: "check", done: true }],
    ]);
  });

  it("reads a picture line in a chat fence as a sender's avatar, not a message", () => {
    const { scene } = parse(fence("chat", "![Ana](media/ana.jpeg)\nuser: Who reviews this?\nAna: I do.") + "- Ask.\n- Answer.\n");
    expect(scene.steps.map((s) => s.part)).toEqual([{ kind: "chat", message: 0 }, { kind: "chat", message: 1 }]);
    expect(scene.fence?.src).toBe("user: Who reviews this?\nAna: I do.");
    expect(scene.fence?.avatars).toEqual({ Ana: "media/ana.jpeg" });
  });

  it("reads [!] as a check that fails on its step", () => {
    const { scene } = parse("- [!] c\n");
    expect(scene.steps.map((s) => [s.text, s.part])).toEqual([["c", { kind: "check", done: false, fail: true }]]);
  });

  it("turns a list of time ranges into one agenda step", () => {
    const { scene } = parse("- 09:00–09:45 Basics\n- 09:45-10:30 Practice ←\n- 10:30 – 11:00 Wrap-up\n");
    expect(scene.steps).toHaveLength(1);
    expect(scene.steps[0].part).toEqual({
      kind: "agenda",
      rows: [
        { from: "09:00", to: "09:45", title: "Basics", current: false },
        { from: "09:45", to: "10:30", title: "Practice", current: true },
        { from: "10:30", to: "11:00", title: "Wrap-up", current: false },
      ],
    });
  });

  it("turns a table into a comparison: one step per row, marks from ✓ ✗ ~", () => {
    const { scene, problems } = parse("| | Basic | Team |\n| --- | --- | --- |\n| SSO | ✗ | ✓ |\n| Audit log | ~ | 30 days |\n\n> The note.\n");
    expect(problems).toEqual([]);
    expect(scene.table).toEqual({ columns: ["Basic", "Team"], rows: [{ label: "SSO", cells: [false, true] }, { label: "Audit log", cells: ["~", "30 days"] }] });
    expect(scene.steps.map((s) => [s.text, s.part, s.notes])).toEqual([
      ["SSO", { kind: "compare", row: 0 }, ""],
      ["Audit log", { kind: "compare", row: 1 }, "The note."],
    ]);
  });

  it("reads ✔ and ✘ as marks too, and reports a second table", () => {
    const t = "| | A |\n| - | - |\n| x | ✔ |\n| y | ✘ |\n\n";
    const { scene, problems } = parse(t + t);
    expect(scene.table?.rows.map((r) => r.cells[0])).toEqual([true, false]);
    expect(problems).toEqual([`${F}/scene.md: one table per scene`]);
  });

  it("keeps a mix of time and plain items as plain steps", () => {
    const { scene } = parse("- 09:00–09:45 Basics\n- Lunch\n");
    expect(scene.steps.map((s) => s.part)).toEqual([undefined, undefined]);
  });

  it("parses an unknown fence language, and the renderer reports it", () => {
    const { scene, problems } = parse(fence("cobol", "DISPLAY 'HI'."));
    expect(problems).toEqual([]);
    expect(scene.fence?.lang).toBe("cobol");
    expect(fenceProblem(scene.fence!.lang)).toBe('language "cobol" not bundled; shown plain');
    expect(fenceProblem("ts")).toBeNull();
    expect(fenceProblem("console")).toBeNull();
  });
});
