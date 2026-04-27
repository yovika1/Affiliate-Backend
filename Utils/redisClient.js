import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = Number(process.env.REDIS_PORT || 6379);

let client;
let connectPromise;
let redisDisabled = false;
let hasLoggedConnection = false;

const buildClient = () => {
  if (client || redisDisabled) return client;

  client = createClient(
    redisUrl
      ? { url: redisUrl }
      : {
          socket: {
            host: redisHost,
            port: redisPort,
          },
        }
  );

  client.on("error", (error) => {
    console.error("Redis error:", error.message);
  });

  return client;
};

const ensureConnected = async () => {
  if (redisDisabled) return null;

  const redisClient = buildClient();
  if (!redisClient) return null;

  if (redisClient.isOpen) return redisClient;

  if (!connectPromise) {
    connectPromise = redisClient.connect().catch((error) => {
      redisDisabled = true;
      console.error("Redis connection failed:", error.message);
      return null;
    });
  }

  const connectedClient = await connectPromise;
  if (connectedClient?.isOpen && !hasLoggedConnection) {
    hasLoggedConnection = true;
    console.log(`Redis connected at ${redisHost}:${redisPort}`);
  }
  return connectedClient?.isOpen ? connectedClient : null;
};

const serialize = (value) => {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

const deserialize = (value) => {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const getCache = async (key) => {
  try {
    const redisClient = await ensureConnected();
    if (!redisClient) return null;

    const value = await redisClient.get(key);
    if (value == null) return null;

    return deserialize(value);
  } catch (error) {
    console.error(`Redis getCache failed for ${key}:`, error.message);
    return null;
  }
};

export const setCache = async (key, value, ttlInSeconds = 3600) => {
  try {
    const redisClient = await ensureConnected();
    if (!redisClient) return false;

    await redisClient.set(key, serialize(value), {
      EX: ttlInSeconds,
    });

    return true;
  } catch (error) {
    console.error(`Redis setCache failed for ${key}:`, error.message);
    return false;
  }
};

export const initRedis = async () => {
  return ensureConnected();
};

export default {
  initRedis,
  getCache,
  setCache,
};
