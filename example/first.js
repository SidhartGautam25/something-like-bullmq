// Subscribe to dead jobs
await queue.subscribeToEvents((event) => {
  if (event.event === "dead") {
    console.error("Dead job detected:", event.jobId);
  }
});

// Later you can fetch dead jobs manually
const deadJobs = await redis.zrange(`queue:email:dead`, 0, -1);
deadJobs.forEach((jobStr) => {
  const job = JSON.parse(jobStr);
  console.log("Dead job:", job);
});
