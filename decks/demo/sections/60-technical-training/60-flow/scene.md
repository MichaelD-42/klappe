## Where retry runs

- The client, the API, the queue and the worker.
- Three jobs travel from the client to the worker.
- The worker is where retry runs.

> The client hands the job to the API, the API puts it on a queue, and a worker takes it from there. Retries happen in the worker, out of the client's way.
