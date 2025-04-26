// producer.js
import { TinyQueue } from "./queue.js";

const queue = new TinyQueue("test");

const run = async () => {
  for (let i = 1; i <= 5; i++) {
    await queue.add({ text: `Job ${i}` });
    console.log(`Enqueued Job ${i}`);
  }
  process.exit();
};

run();
