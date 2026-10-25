import path from 'node:path'
import { expect, test } from 'vitest'
import { inWorktrees } from '../../vite.config'

// Builder worktrees under <root>/.claude/worktrees reload the page; a server that runs inside a worktree still watches its own files.
test('the watcher skips worktrees under the project root, not the files of a server inside one', () => {
  const root = path.resolve('/deck')
  const tree = path.join(root, '.claude', 'worktrees', 'agent-1')
  expect(inWorktrees(root)(path.join(tree, 'src', 'a.ts'))).toBe(true)
  expect(inWorktrees(root)(path.join(root, 'src', 'a.ts'))).toBe(false)
  expect(inWorktrees(tree)(path.join(tree, 'src', 'a.ts'))).toBe(false)
  expect(inWorktrees(root)(path.resolve('/elsewhere/.claude/worktrees/x/a.ts'))).toBe(false)
})
