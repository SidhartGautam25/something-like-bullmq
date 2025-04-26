// queue.js
import Redis from "ioredis";

const redis = new Redis();

export class TinyQueue {
  constructor(name) {
    this.name = name;
  }

  // Internal keys
  get waitingKey() {
    return `queue:${this.name}:waiting`;
  }
  get activeKey() {
    return `queue:${this.name}:active`;
  }
  get delayedKey() {
    return `queue:${this.name}:delayed`;
  }
  get completedKey() {
    return `queue:${this.name}:completed`;
  }
  get failedKey() {
    return `queue:${this.name}:failed`;
  }

  async add(data, options = {}) {
    const job = {
      id: Date.now() + Math.random(),
      data,
      attempts: options.attempts || 3, // retry attempts
      delayUntil: options.delayUntil || 0, // timestamp (milliseconds)
      priority: options.priority || 0, // lower = higher priority
      createdAt: Date.now(),
      state: "waiting",
    };

    const jobStr = JSON.stringify(job);

    if (job.delayUntil > Date.now()) {
      await redis.zadd(this.delayedKey, job.delayUntil, jobStr);
    } else {
      await redis.zadd(this.waitingKey, job.priority, jobStr);
    }
  }

  async get() {
    // First, move delayed jobs that are due
    const now = Date.now();
    const dueJobs = await redis.zrangebyscore(this.delayedKey, 0, now);

    for (const jobStr of dueJobs) {
      const job = JSON.parse(jobStr);
      await redis.zadd(this.waitingKey, job.priority, jobStr);
      await redis.zrem(this.delayedKey, jobStr);
    }

    // Fetch the highest priority job
    const jobs = await redis.zrange(this.waitingKey, 0, 0);

    if (jobs.length === 0) {
      return null;
    }

    const jobStr = jobs[0];
    const job = JSON.parse(jobStr);

    // Move job to active
    await redis.zrem(this.waitingKey, jobStr);
    await redis.zadd(this.activeKey, Date.now(), jobStr);

    return job;
  }

  async complete(job) {
    const jobStr = JSON.stringify(job);
    await redis.zrem(this.activeKey, jobStr);
    await redis.zadd(this.completedKey, Date.now(), jobStr);
  }

  async fail(job) {
    const jobStr = JSON.stringify(job);

    job.attempts -= 1;

    await redis.zrem(this.activeKey, jobStr);

    if (job.attempts > 0) {
      // Retry: put back into waiting
      const newJobStr = JSON.stringify(job);
      await redis.zadd(this.waitingKey, job.priority, newJobStr);
    } else {
      // Failed permanently
      const failedJobStr = JSON.stringify({
        ...job,
        failedAt: Date.now(),
      });
      await redis.zadd(this.failedKey, Date.now(), failedJobStr);
    }
  }
}
