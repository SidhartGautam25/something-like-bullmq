// worker.js
import { TinyQueue } from "./queue.js";

const queue = new TinyQueue("test");

const run = async () => {
  console.log("Worker waiting for jobs...");
  while (true) {
    const job = await queue.get();
    console.log(`Processing job:`, job.data);
    await new Promise((res) => setTimeout(res, 1000)); // simulate work
  }
};

run();
