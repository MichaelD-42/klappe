# Backlog

Open work only, ranked within each section; CHANGELOG.md lists what is done and git history has the old lists. A defect is fixed test-first: if its test already passes, the entry was stale and is dropped.

## Effects

- Decorative loop elements (an animated character, an avatar): the user has them in another repo and brings them over. Check them against the background loop rules (under `data-k-ignore`, still with reduced motion and in the self-test, paused off screen), as `mesh3d` does.
- `annotate` on dense code: a ring reaches the lines around it. Documented; a ring that flattens to the line gap would need the code panel's line height.
- Parallax moves one layer, the background. Several depths (a near and a far layer) would need a layer list on the background.
- Semantic zoom: the camera flies into a box (a system, a team) and its insides build as it lands, level by level (container, components, code). Uses the canvas for nesting; `dollyZoom`, `tilt` and the `zoom` transition only move the camera.
- `gitGraph`: commits, branches, merge and rebase, one per step, for developer trainings. A bounded layout like `decisionTree`.
- UI walkthrough pointer: a cursor that moves over a screenshot, clicks with a ripple and can type into a field. `loupe` and `spotlight` point; nothing shows the action.
- `stateMachine`: states with the current one lit and a transition edge firing per step. Check first whether it fits as a mode of `flow`.
- `chart` types `scatter` and `bubble` (size as a third value, optionally moving over time like `barRace`): no chart type has two numeric axes; `matrix` is qualitative.

