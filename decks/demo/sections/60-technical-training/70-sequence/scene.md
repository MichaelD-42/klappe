## The same request, in time

- The client, the API, the queue and the worker.
- The client posts the job; the API puts it on the queue.
- The API answers at once: 202 Accepted.
- Later, the worker takes the job and runs it with retry.
- The worker acknowledges the job.

> Read it top to bottom: the client has its answer before the worker even starts. That is why a slow retry does not hold up the client.
