## The retry bug

- A helper that waits.
- How many attempts, how long to wait.
- Each attempt runs the task.
- On failure: log, wait longer, try again.
- No luck: throw the last error.

> Read it once, top to bottom, before we hunt for the bug. Twenty lines, nothing clever.

- The loop runs while i <= attempts.
- With three attempts asked for, the task runs four times.

> Count the calls: i takes the values 0, 1, 2 and 3. That is one call more than the caller asked for.

- The fix: `i < attempts`. Nothing else changes.

> One character. The loop now stops after exactly the attempts asked for.

- The tests run: all three pass.
- The whole change is one line.

> Sample data, not a real run. The test "stops after 3 attempts" is the one that caught the bug.
