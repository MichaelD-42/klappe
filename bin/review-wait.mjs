import fs from 'node:fs'
import path from 'node:path'

// Resolves with ready(review.md) once it lists something: at once, or after a later save. It watches the folder,
// not the file: the file may not exist yet, and an editor that saves by rename replaces the watched file.
export function waitForReady(file, ready) {
  const check = () => (fs.existsSync(file) ? ready(fs.readFileSync(file, 'utf8')) : [])
  const now = check()
  if (now.length) return Promise.resolve(now)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  return new Promise((resolve) => {
    const watcher = fs.watch(path.dirname(file), (_, name) => {
      if (name && name !== path.basename(file)) return
      const got = check()
      if (!got.length) return
      watcher.close()
      resolve(got)
    })
  })
}
