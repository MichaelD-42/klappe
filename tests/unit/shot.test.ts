import { expect, test } from 'vitest'
import { pickSteps } from '../../bin/shot.mjs'
import type { StepAddr } from '../../src/types'

// Two scenes of three and two steps in section a, one scene of one step in section b.
const steps: StepAddr[] = [
  ['a', 'x', 3],
  ['a', 'y', 2],
  ['b', 'z', 1],
].flatMap(([section, scene, n]) => Array.from({ length: n as number }, (_, i) => ({ section, scene, step: i + 1 }) as StepAddr))
  .map((s, index) => ({ ...s, index, canvas: s.section === 'a' ? 0 : 1 }))
const ids = (r: { picked: StepAddr[] }) => r.picked.map((s) => `${s.section}/${s.scene}/${s.step}`)

test('a target picks a section, a scene or a step, as a deep link names it', () => {
  expect(ids(pickSteps(steps, ['b'], false))).toEqual(['b/z/1'])
  expect(ids(pickSteps(steps, ['a/y'], false))).toEqual(['a/y/1', 'a/y/2'])
  expect(ids(pickSteps(steps, ['#/a/x/2', 'b'], false))).toEqual(['a/x/2', 'b/z/1'])
})

test('no target picks every step; last keeps the last step of each scene', () => {
  expect(pickSteps(steps, [], false).picked).toHaveLength(6)
  expect(ids(pickSteps(steps, [], true))).toEqual(['a/x/3', 'a/y/2', 'b/z/1'])
  expect(ids(pickSteps(steps, ['a'], true))).toEqual(['a/x/3', 'a/y/2'])
})

test('a target that names no step is reported', () => {
  expect(pickSteps(steps, ['a/x/9', 'c', 'a'], false).unknown).toEqual(['a/x/9', 'c'])
})

// --last with a step target picked nothing, and the old PNG on disk passed for a new shot.
test('a step target is shot as named under last; last thins only section and scene targets', () => {
  expect(ids(pickSteps(steps, ['a/x/1'], true))).toEqual(['a/x/1'])
  expect(ids(pickSteps(steps, ['a/x/1', 'a/y'], true))).toEqual(['a/x/1', 'a/y/2'])
})
