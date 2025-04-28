// server.js
import express from "express";
import { TinyQueue } from "../../queue";
import Redis from "ioredis";

const app = express();
app.use(express.json());

const queue = new TinyQueue("fibqueue");

app.post("/submit", async (req, res) => {
  const { n } = req.body;

  if (typeof n !== "number" || n < 0) {
    return res.status(400).json({ error: "n must be a non-negative number." });
  }

  // Create job manually so we can get its ID
  const now = Date.now();
  const job = {
    id: now + Math.random(),
    data: { n },
    attempts: 3,
    delayUntil: 0,
    priority: 1,
    createdAt: now,
    ttl: queue.defaultJobTTL,
    state: "waiting",
  };

  const jobStr = JSON.stringify(job);

  // Push it into waiting queue
  await Redis.zadd(queue.waitingKey, job.priority, jobStr);

  res.status(201).json({
    message: `Job to calculate Fibonacci(${n}) submitted.`,
    jobId: job.id, // 💥 send back jobId to client
  });
});

app.get("/result/:jobId", async (req, res) => {
  const { jobId } = req.params;

  const result = await queue.getResult(jobId);

  if (!result) {
    return res
      .status(404)
      .json({ error: "Result not found or job not completed yet." });
  }

  res.json({ result });
});

app.get("/metrics", async (req, res) => {
  const metrics = await queue.metrics();
  res.json(metrics);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
