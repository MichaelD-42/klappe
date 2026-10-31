---
story: The agent flags the bug, a person checks it, and a one-character fix is found in review, before production.
---
## Caught in review

- The camera follows the stream to Design: the code behind a retry.

> Twenty lines that retry a task. Read it once, top to bottom.

- The loop runs while i <= attempts.

> Count the calls: three attempts asked for, four made. The agent flagged it; a person checks it.

- The fix: one character, `<=` becomes `<`.

> Nothing else changes. Found in review, before it ever ran in production.
