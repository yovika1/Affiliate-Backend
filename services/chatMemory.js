import Chat from "../models/Chat.js";
import { getCache, setCache } from "../Utils/redisClient.js";

export const getSessionHistory = async (sessionId) => {
  const key = `chat:${sessionId}`;
  const cached = await getCache(key);
  if (Array.isArray(cached)) return cached;

  const doc = await Chat.findOne({ sessionId }).lean();
  const history = doc?.messages || [];

  await setCache(key, history, 60 * 10);
  return history;
};

export const saveSessionHistory = async (sessionId, messages) => {
  await Chat.findOneAndUpdate(
    { sessionId },
    { $set: { messages, updatedAt: new Date() } },
    { upsert: true, setDefaultsOnInsert: true }
  );

  await setCache(`chat:${sessionId}`, messages, 60 * 10);
};
