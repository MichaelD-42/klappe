## The tests pass

```console
$ npm test
 ✓ returns the first success
 ✓ waits longer after each failure
 ✓ stops after 3 attempts
 3 passed
$ git diff --stat
 retry.js | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

- The tests run: all three pass.
- The whole change is one line.

> A sample run. The test "stops after 3 attempts" is the one that caught the bug.
