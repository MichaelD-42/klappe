import { describe, expect, test } from 'vitest'
import { lineDiff, MAX_LINES, parseGroups } from '../../src/fx/code'

describe('lineDiff', () => {
  test('an LCS over lines: keep, delete, keep, add', () => {
    expect(lineDiff(['a', 'b', 'c'], ['a', 'c', 'd'])).toEqual([
      { op: 'keep', from: 0, to: 0 },
      { op: 'del', from: 1 },
      { op: 'keep', from: 2, to: 1 },
      { op: 'add', to: 2 },
    ])
  })

  test('empty sides, identical sides and a full replace', () => {
    expect(lineDiff([], ['x'])).toEqual([{ op: 'add', to: 0 }])
    expect(lineDiff(['x'], [])).toEqual([{ op: 'del', from: 0 }])
    expect(lineDiff(['x', 'y'], ['x', 'y'])).toEqual([
      { op: 'keep', from: 0, to: 0 },
      { op: 'keep', from: 1, to: 1 },
    ])
    expect(lineDiff(['x'], ['y'])).toEqual([
      { op: 'del', from: 0 },
      { op: 'add', to: 0 },
    ])
  })

  test('a moved line keeps the longest common run', () => {
    const ops = lineDiff(['a', 'b', 'c', 'd'], ['b', 'c', 'd', 'a'])
    expect(ops.filter((o) => o.op === 'keep')).toHaveLength(3)
    expect(ops).toContainEqual({ op: 'del', from: 0 })
    expect(ops).toContainEqual({ op: 'add', to: 3 })
  })
})

describe('parseGroups bounds', () => {
  test('line 0 stays in the group, so code() can report it', () => {
    expect(parseGroups('0-2')).toEqual([[0, 1, 2]])
  })

  test('a huge range is clamped before it is expanded, and keeps its end for the report', () => {
    const [g] = parseGroups('1-99999999')
    expect(g).toHaveLength(MAX_LINES + 1)
    expect(g[MAX_LINES - 1]).toBe(MAX_LINES)
    expect(g[MAX_LINES]).toBe(99999999)
  })

  test('a reversed range lists its lines high to low, so code() can report it', () => {
    expect(parseGroups('4-2')).toEqual([[4, 3, 2]])
  })

  test('a reversed huge range is clamped too', () => {
    expect(parseGroups('99999999-998')).toEqual([[99999999, 999, 998]])
  })
})
