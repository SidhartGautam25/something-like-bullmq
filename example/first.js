const queue = new TinyQueue("email");

// Pause the queue
await queue.pause();

// Resume it
await queue.resume();

// Subscribe to events
await queue.subscribeToEvents((event) => {
  console.log("Queue Event:", event);
});

// Add job
await queue.add({ email: "hello@example.com" });

// Worker loop
const job = await queue.get();
if (job) {
  try {
    console.log("Processing", job.data);
    await queue.complete(job);
  } catch (err) {
    await queue.fail(job);
  }
}
