import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import aiRouter from "../routes/aiChat.js";
import connectDB from "../dbConnection/Connection.js";
import { initRedis } from "../Utils/redisClient.js";

dotenv.config();

const DEFAULT_TEST_CASES = [
  "best t shirts for women under 800",
  "show me formal shirts for men under 1800",
  "suggest dresses under 2000",
];

const parseCases = () => {
  const raw = process.env.AI_TEST_CASES;
  if (!raw) return DEFAULT_TEST_CASES;

  return raw
    .split("||")
    .map((item) => item.trim())
    .filter(Boolean);
};

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/ai", aiRouter);
  return app;
};

const summarizeResponse = (payload = {}) => ({
  message: payload.message,
  intent: payload.intent || null,
  productsCount: Array.isArray(payload.products) ? payload.products.length : 0,
  topProducts: Array.isArray(payload.products)
    ? payload.products.slice(0, 3).map((product) => ({
        productName: product.productName,
        brand: product.brand,
        price: product.currentPrice,
        category: product.category,
      }))
    : [],
  outfitKeys: payload.outfit ? Object.keys(payload.outfit) : [],
  fallbackMessage: payload.fallbackMessage || null,
});

const run = async () => {
  const cases = parseCases();
  const port = Number(process.env.AI_TEST_PORT || 8099);
  const app = createApp();

  try {
    await connectDB();
    await initRedis();

    const server = await new Promise((resolve) => {
      const instance = app.listen(port, () => resolve(instance));
    });

    console.log(`[ai-test] server ready on port ${port}`);

    for (let index = 0; index < cases.length; index += 1) {
      const query = cases[index];
      const sessionId = `smoke-${Date.now()}-${index}`;

      const response = await fetch(`http://127.0.0.1:${port}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          message: query,
        }),
      });

      const payload = await response.json();

      console.log(`\n[ai-test] Case ${index + 1}`);
      console.log(`[ai-test] Query: ${query}`);
      console.log(`[ai-test] Status: ${response.status}`);
      console.log(
        `[ai-test] Summary: ${JSON.stringify(summarizeResponse(payload), null, 2)}`,
      );
    }

    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("[ai-test] failed:", error.message);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
};

run();
