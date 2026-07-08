// Simple in-memory rate limiter (no external dependency needed)
const attempts = new Map();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

export function rateLimit(req, res, next) {
  const key = req.ip + ":" + req.path;
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.start > WINDOW_MS) {
    attempts.set(key, { start: now, count: 1 });
    return next();
  }

  entry.count++;
  if (entry.count > MAX_ATTEMPTS) {
    return res.status(429).json({ error: "Too many attempts. Please try again later." });
  }

  return next();
}

// Cleanup stale entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (now - entry.start > WINDOW_MS) attempts.delete(key);
  }
}, 30 * 60 * 1000);
