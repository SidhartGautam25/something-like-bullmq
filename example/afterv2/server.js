// server.js
import express from "express";
import { TinyQueue } from "../../queue";

const app = express();
app.use(express.json());

const queue = new TinyQueue("fibqueue");

app.post("/submit", async (req, res) => {
  const { n } = req.body;

  if (typeof n !== "number" || n < 0) {
    return res.status(400).json({ error: "n must be a non-negative number." });
  }

  await queue.add({ n }, { priority: 1 });

  res
    .status(201)
    .json({ message: `Job to calculate Fibonacci(${n}) submitted.` });
});

app.get("/metrics", async (req, res) => {
  const metrics = await queue.metrics();
  res.json(metrics);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
