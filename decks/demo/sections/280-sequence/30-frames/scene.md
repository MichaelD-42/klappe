## Retries, in time

> Activation bars show who is busy; a note row explains a step; alt, loop, opt and par frames group rows, each frame showing with its first row.

- The actors.
- The client posts a job; the API is busy until it answers.
- A note: the API checks the body.
- If the body is valid, the API hands the job on.
- The worker tries until the job succeeds.
- It reports back; the client gets its answer. Otherwise a 400.
