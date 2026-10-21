## The tests pass

- Sample data: a made-up test run.

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

> Sample data, not a real run. The test "stops after 3 attempts" is the one that caught the bug.
