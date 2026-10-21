## How retry works

```js {2-3|5-8|10-12|13-17|19}
// Runs task until it succeeds or the attempts run out.
const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function retry(task, opts = {}) {
  const attempts = opts.attempts ?? 3;
  const delay = opts.delay ?? 200;
  let lastError;

  for (let i = 0; i <= attempts; i++) {
    try {
      return await task();
    } catch (err) {
      lastError = err;
      console.warn(`attempt ${i + 1} failed`);
      await sleep(delay * 2 ** i);
    }
  }
  throw lastError;
}
```

- A helper that waits.
- How many attempts, how long to wait.
- Each attempt runs the task.
- On failure: log, wait longer, try again.
- No luck: throw the last error.

> Read it once, top to bottom, before we hunt for the bug. Twenty lines, nothing clever.
