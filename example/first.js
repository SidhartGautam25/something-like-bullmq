// Create queue with custom TTL
const queue = new TinyQueue("email", {
  jobTTL: 2 * 60 * 60 * 1000, // 2 hours
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
});

// Cleanup happens automatically!

// To manually stop cleanup loop (if app shutting down)
queue.stopCleanupLoop();
