## Where retry runs

- The client, the API, the queue and the worker.
- Three jobs travel from the client to the worker.
- The worker is where retry runs.

> The client hands the job to the API, the API puts it on a queue, and a worker takes it from there. Retries happen in the worker, out of the client's way.

- The same request in time: the client posts the job; the API puts it on the queue.
- The API answers at once: 202 Accepted.
- Later, the worker takes the job and runs it with retry.
- The worker acknowledges the job.

> Read it top to bottom: the client has its answer before the worker even starts. That is why a slow retry does not hold up the client.
