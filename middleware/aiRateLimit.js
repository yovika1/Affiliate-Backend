import { createHash } from "node:crypto";
import { getCache, setCache } from "../utils/redisClient.js";

const WINDOW_SECONDS = Number(process.env.AI_RATE_LIMIT_WINDOW_SEC || 60);
const MAX_REQUESTS = Number(process.env.AI_RATE_LIMIT_MAX || 20);
const memoryStore = new Map();

const cleanupMemoryStore = () => {
  const currentTime = Date.now();

  for (const [key, value] of memoryStore.entries()) {
    if (value.expiresAt <= currentTime) {
      memoryStore.delete(key);
    }
  }
};

const getClientIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(forwardedFor || "").split(",")[0].trim();

  return forwardedIp || req.ip || req.socket?.remoteAddress || "unknown";
};

const buildBucketKey = (req) => {
  const ip = getClientIp(req);
  const sessionId = String(req.body?.sessionId || "").trim();
  const fingerprint = createHash("sha1")
    .update(`${ip}:${sessionId}`)
    .digest("hex")
    .slice(0, 16);

  return `ratelimit:ai:${fingerprint}`;
};

const getMemoryBucket = (key) => {
  cleanupMemoryStore();

  const currentTime = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || existing.expiresAt <= currentTime) {
    const next = {
      count: 1,
      expiresAt: currentTime + WINDOW_SECONDS * 1000,
    };
    memoryStore.set(key, next);
    return next;
  }

  existing.count += 1;
  memoryStore.set(key, existing);
  return existing;
};

const getRedisBucket = async (key) => {
  const existing = await getCache(key);

  if (!existing || typeof existing !== "object") {
    const next = { count: 1 };
    const saved = await setCache(key, next, WINDOW_SECONDS);
    return saved ? next : null;
  }

  const next = {
    ...existing,
    count: Number(existing.count || 0) + 1,
  };

  const saved = await setCache(key, next, WINDOW_SECONDS);
  return saved ? next : null;
};

export const aiRateLimit = async (req, res, next) => {
  try {
    const key = buildBucketKey(req);
    const bucket = (await getRedisBucket(key)) || getMemoryBucket(key);
    const count = Number(bucket?.count || 0);

    if (count > MAX_REQUESTS) {
      return res.status(429).json({
        error: "Too many AI requests. Please try again shortly.",
      });
    }

    res.setHeader("X-RateLimit-Limit", String(MAX_REQUESTS));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, MAX_REQUESTS - count)));
    res.setHeader("X-RateLimit-Window", String(WINDOW_SECONDS));

    return next();
  } catch (error) {
    console.error("[rate-limit] Error:", error.message);
    return next();
  }
};

export default aiRateLimit;
