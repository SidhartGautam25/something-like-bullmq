async function processJobs() {
  while (true) {
    const job = await queue.get();

    if (!job) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    try {
      const n = job.data.n;

      console.log(`[Worker] Processing Fibonacci(${n})`);

      const result = calculateFibonacci(n);

      console.log(`[Worker] Fibonacci(${n}) = ${result}`);

      // 💥 Store the result separately
      await queue.storeResult(job.id, { input: n, output: result });

      // Complete the job
      await queue.complete(job);
    } catch (error) {
      console.error("[Worker] Error processing job", error);
      await queue.fail(job);
    }
  }
}
