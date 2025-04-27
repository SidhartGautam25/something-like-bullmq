// Create queue
const queue = new TinyQueue("reports", {
  jobTTL: 6 * 60 * 60 * 1000, // 6 hours default
});

// Add normal job (default TTL applies)
await queue.add({ reportId: 123 });

// Add important job (custom TTL: 1 day)
await queue.add({ reportId: 456 }, { ttl: 24 * 60 * 60 * 1000 });
