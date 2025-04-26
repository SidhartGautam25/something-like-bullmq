// queue.js
import Redis from "ioredis";

const redis = new Redis();

export class TinyQueue {
  constructor(name) {
    this.name = name; // e.g. 'emailQueue'
  }

  async add(data) {
    const job = JSON.stringify({
      id: Date.now() + Math.random(), // simple unique ID
      data,
    });
    await redis.lpush(`queue:${this.name}`, job);
  }

  async get() {
    const result = await redis.brpop(`queue:${this.name}`, 0); // [key, value]
    return JSON.parse(result[1]);
  }
}
