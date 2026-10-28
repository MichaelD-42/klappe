---
dimension: intent_fidelity
version: 1
applies_to: [framework, deck]
reviewer: content
levels: [full, partial, divergent, unassessable]
rule-full: [none, pass]
rule-partial: [Important, builder]
rule-divergent: [Critical, planner]
rule-unassessable: [Minor, owner]
---

# Intent fidelity

Judge only the acceptance criteria in the task brief and the diff. Do not take the builder's report as proof: check each criterion in the diff yourself. Do not judge whether the criteria are good; that is the planner's job.

For a deck task, the criteria are the owner's review entries for the scene, quoted in the brief. Read them as the owner meant them: "less text" means fewer words on screen, not the same words in a smaller font.

## full

Every criterion is met in the diff, and nothing else changed that the brief did not ask for.
Evidence: name each criterion id and the file and line that meets it.

## partial

The core is there, but at least one criterion is open, or the diff also changes something the brief did not ask for (a moved section, a renamed option, an extra effect).
Evidence: quote the open criterion, or name the unasked change with file and line.

## divergent

The diff answers a different request than the brief, so the next round must start from the brief again, not from this diff. Typical: the owner asked to cut a scene and the builder rewrote it; the owner asked for fixed-length timers and the builder fixed one timer's end time.
Evidence: quote the criterion and say what the diff does instead.

## unassessable

The brief has no criteria, or the diff cannot show them (for example a look criterion with no screenshot).
Evidence: say what is missing.

## Output

One line, after the `VERDICT:` line:
`RUBRIC intent_fidelity: <level> — <evidence>`
