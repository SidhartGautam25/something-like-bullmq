const queue = new TinyQueue("email");

// Adding a job
await queue.add(
  { email: "user@example.com" },
  { attempts: 5, priority: 1, delayUntil: Date.now() + 5000 }
);

// Worker
const job = await queue.get();
if (job) {
  try {
    // Process the job
    console.log("Processing", job.data);

    await queue.complete(job);
  } catch (err) {
    console.error("Job failed", err);
    await queue.fail(job);
  }
}

// You must call either complete(job) or fail(job) after get().
// Delays are pulled automatically inside get().
// Priority is handled by Redis zrange — lowest score first.
