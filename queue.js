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
  get deadLetterKey() {
    return `queue:${this.name}:dead`;
  }
  get pauseKey() {
    return `queue:${this.name}:paused`;
  }
  get eventChannel() {
    return `queue:${this.name}:events`;
  }

  async add(data, options = {}) {
    const job = {
      id: Date.now() + Math.random(),
      data,
      attempts: options.attempts || 3,
      delayUntil: options.delayUntil || 0,
      priority: options.priority || 0,
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
    const isPaused = await redis.get(this.pauseKey);
    if (isPaused) {
      return null;
    }

    const now = Date.now();
    const dueJobs = await redis.zrangebyscore(this.delayedKey, 0, now);

    for (const jobStr of dueJobs) {
      const job = JSON.parse(jobStr);
      await redis.zadd(this.waitingKey, job.priority, jobStr);
      await redis.zrem(this.delayedKey, jobStr);
    }

    const jobs = await redis.zrange(this.waitingKey, 0, 0);
    if (jobs.length === 0) {
      return null;
    }

    const jobStr = jobs[0];
    const job = JSON.parse(jobStr);

    await redis.zrem(this.waitingKey, jobStr);
    await redis.zadd(this.activeKey, Date.now(), jobStr);

    return job;
  }

  async complete(job) {
    const jobStr = JSON.stringify(job);
    await redis.zrem(this.activeKey, jobStr);
    await redis.zadd(this.completedKey, Date.now(), jobStr);

    await redis.publish(
      this.eventChannel,
      JSON.stringify({
        event: "completed",
        jobId: job.id,
        timestamp: Date.now(),
      })
    );
  }

  async fail(job) {
    const jobStr = JSON.stringify(job);

    job.attempts -= 1;
    await redis.zrem(this.activeKey, jobStr);

    if (job.attempts > 0) {
      const newJobStr = JSON.stringify(job);
      await redis.zadd(this.waitingKey, job.priority, newJobStr);
    } else {
      const deadJob = {
        ...job,
        failedAt: Date.now(),
        movedToDeadLetter: true,
      };
      const deadJobStr = JSON.stringify(deadJob);

      // Move to dead letter queue
      await redis.zadd(this.deadLetterKey, Date.now(), deadJobStr);

      // Also add a copy in failed queue
      await redis.zadd(this.failedKey, Date.now(), deadJobStr);

      await redis.publish(
        this.eventChannel,
        JSON.stringify({
          event: "dead",
          jobId: job.id,
          timestamp: Date.now(),
        })
      );
    }
  }

  async pause() {
    await redis.set(this.pauseKey, "1");
  }

  async resume() {
    await redis.del(this.pauseKey);
  }

  async subscribeToEvents(handler) {
    const sub = new Redis();
    await sub.subscribe(this.eventChannel);

    sub.on("message", (channel, message) => {
      const event = JSON.parse(message);
      handler(event);
    });

    return sub;
  }
}

/*

Now when a job fails after all retries,it's moved to queue:name:dead

new event type:"dead" when moved to dead letter queue

we all record it in the faild queue for easier tracking

Now your system can safely track jobs that fully fail without losing them.

*/
