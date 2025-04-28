// worker.js
import { TinyQueue } from "../../queue";

const queue = new TinyQueue("fibqueue");

function calculateFibonacci(n) {
  if (n <= 1) return n;
  let a = 0,
    b = 1,
    c;
  for (let i = 2; i <= n; i++) {
    c = a + b;
    a = b;
    b = c;
  }
  return b;
}

async function processJobs() {
  while (true) {
    const job = await queue.get();

    if (!job) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // No job? Wait 1 second
      continue;
    }

    try {
      const n = job.data.n;

      console.log(`[Worker] Processing Fibonacci(${n})`);

      const result = calculateFibonacci(n);

      console.log(`[Worker] Fibonacci(${n}) = ${result}`);

      // Attach result to job and complete it
      job.result = result;
      await queue.complete(job);
    } catch (error) {
      console.error("[Worker] Error processing job", error);
      await queue.fail(job);
    }
  }
}

async function start() {
  // Listen to events
  await queue.subscribeToEvents((event) => {
    console.log(
      `[Event] Job ${event.jobId} - ${event.event} at ${new Date(
        event.timestamp
      ).toISOString()}`
    );
  });

  processJobs();
}

start();
